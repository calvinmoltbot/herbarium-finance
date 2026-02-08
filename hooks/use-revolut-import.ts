// React hooks for Revolut import functionality

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { RevolutCSVParser } from '@/lib/revolut-parser';
import { TransactionMatcher } from '@/lib/transaction-matcher';
import { PatternMatcher } from '@/lib/pattern-matcher';
import {
  ImportedTransaction,
  MatchingResult,
  RevolutImportStats
} from '@/lib/revolut-types';
import { toast } from 'sonner';

const supabase = createClient();

// Hook for importing Revolut CSV file
export function useRevolutImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStats, setImportStats] = useState<RevolutImportStats | null>(null);
  const queryClient = useQueryClient();

  const importCSV = async (file: File): Promise<MatchingResult> => {
    setIsProcessing(true);
    
    try {
      // 1. Validate and parse CSV file
      const csvContent = await RevolutCSVParser.validateCSVFile(file);
      const revolutTransactions = RevolutCSVParser.parseCSV(csvContent);
      
      // Generate import statistics
      const stats = RevolutCSVParser.generateStats(revolutTransactions);
      setImportStats(stats);

      // 2. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // 3. Clear any existing test imports to prevent false duplicates
      // NOTE: Using SHARED DATA MODEL - clear entire staging table for new import session
      const { error: clearError } = await supabase
        .from('imported_transactions_test')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (clearError) {
        console.warn('Warning: Could not clear previous test imports:', clearError.message);
        // Continue anyway - this is not critical
      }

      // 4. Convert to ImportedTransaction format and insert into test table
      const importedTransactions: Omit<ImportedTransaction, 'id' | 'created_at' | 'updated_at'>[] = 
        revolutTransactions.map(transaction => ({
          user_id: user.id,
          revolut_type: transaction.type,
          product: transaction.product,
          started_date: transaction.startedDate.toISOString(),
          completed_date: transaction.completedDate?.toISOString() || null,
          original_description: transaction.description,
          amount: transaction.amount,
          fee: transaction.fee,
          currency: transaction.currency,
          state: transaction.state,
          balance: transaction.balance,
          matched_transaction_id: null,
          match_confidence: null,
          match_status: 'unmatched',
          match_reasons: null,
          suggested_category_id: null,
          processed: false,
          reviewed: false,
          verified: false,
          verification_note: null,
          notes: null
        }));

      // 4. Get existing data for duplicate checking
      // NOTE: Using SHARED DATA MODEL - all users see all transactions (no user_id filter)
      const [existingImportsResult, existingTransactionsResult] = await Promise.all([
        supabase
          .from('imported_transactions_test')
          .select('original_description, amount, started_date'),
        supabase
          .from('transactions')
          .select('description, amount, transaction_date, type')
      ]);

      if (existingImportsResult.error) {
        throw new Error(`Failed to check import duplicates: ${existingImportsResult.error.message}`);
      }
      if (existingTransactionsResult.error) {
        console.error('[ERROR] Failed to fetch committed transactions:', existingTransactionsResult.error);
        throw new Error(`Failed to check transaction duplicates: ${existingTransactionsResult.error.message}`);
      }

      const existingImports = existingImportsResult.data || [];
      const existingCommittedTransactions = existingTransactionsResult.data || [];

      const uniqueTransactions = importedTransactions.filter(newTransaction => {
        // Check against existing imports
        const isDuplicateImport = existingImports.some(existing => {
          const existingDate = new Date(existing.started_date);
          const newDate = new Date(newTransaction.started_date);
          const daysDiff = Math.abs((existingDate.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24));

          return existing.original_description === newTransaction.original_description &&
                 Math.abs(existing.amount - newTransaction.amount) < 0.01 &&
                 daysDiff <= 1;
        });

        // Improved duplicate detection against committed transactions
        const isDuplicateTransaction = existingCommittedTransactions.some(existing => {
          const existingDate = new Date(existing.transaction_date);
          const newDate = new Date(newTransaction.started_date);
          const daysDiff = Math.abs((existingDate.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24));

          // Improved description matching
          const normalizeDesc = (desc: string): string => desc.toLowerCase().trim().replace(/\s+/g, ' ');
          const existingDesc = normalizeDesc(existing.description);
          const newDesc = normalizeDesc(newTransaction.original_description);

          // Exact match
          const exactMatch = existingDesc === newDesc;

          // Significant substring match (only if one is clearly a substring of the other)
          const isSignificantSubstring = (str1: string, str2: string): boolean => {
            // Only consider it a match if the substring is at least 80% of the length of the longer string
            if (str1.length < str2.length * 0.8 && str2.length < str1.length * 0.8) return false;
            return str1.includes(str2) || str2.includes(str1);
          };
          const substringMatch = isSignificantSubstring(existingDesc, newDesc);

          // Word similarity match (for cases where words are rearranged)
          const getWords = (str: string): string[] => str.split(/\s+/).filter((w: string) => w.length > 2);
          const existingWords = new Set(getWords(existingDesc));
          const newWords = getWords(newDesc);
          const commonWords = newWords.filter((word: string) => existingWords.has(word));
          const wordSimilarity = commonWords.length / Math.max(existingWords.size, newWords.length);

          const descriptionMatch = exactMatch ||
                                  substringMatch ||
                                  (wordSimilarity > 0.7); // At least 70% word similarity

          // Amount matching - consider transaction type
          const newTransactionType = newTransaction.amount > 0 ? 'income' : 'expenditure';
          const amountMatch = Math.abs(Math.abs(existing.amount) - Math.abs(newTransaction.amount)) < 0.01 &&
                             (existing.type === newTransactionType);

          // Date matching
          const dateMatch = daysDiff <= 1;

          return descriptionMatch && amountMatch && dateMatch;
        });

        return !isDuplicateImport && !isDuplicateTransaction;
      });

      const duplicateCount = importedTransactions.length - uniqueTransactions.length;
      if (duplicateCount > 0) {
        toast.info(`Skipped ${duplicateCount} duplicate transactions`);
      }

      if (uniqueTransactions.length === 0) {
        toast.warning('All transactions appear to be duplicates - no new data imported');
        return {
          totalImported: 0,
          highConfidenceMatches: 0,
          mediumConfidenceMatches: 0,
          lowConfidenceMatches: 0,
          unmatched: 0,
          matches: []
        };
      }

      // 5. Insert unique transactions into test table
      const { data: insertedTransactions, error: insertError } = await supabase
        .from('imported_transactions_test')
        .insert(uniqueTransactions)
        .select();

      if (insertError) {
        throw new Error(`Failed to import transactions: ${insertError.message}`);
      }

      // 5. Get existing transactions for matching
      const { data: existingTransactions, error: existingError } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          transaction_date,
          type,
          category:categories(id, name, color, type)
        `);

      if (existingError) {
        throw new Error(`Failed to fetch existing transactions: ${existingError.message}`);
      }

      // 6. Run matching algorithm
      const matches = TransactionMatcher.matchTransactions(
        insertedTransactions as ImportedTransaction[],
        existingTransactions as unknown as { id: string; description: string; amount: number; transaction_date: string; type: 'income' | 'expenditure'; category?: { id: string; name: string; color: string; type: 'income' | 'expenditure' } }[]
      );

      // 6.5. Get user's categorization patterns for pattern-based suggestions
      console.log('[Pattern Matching] Fetching user patterns...');
      const { data: patterns, error: patternsError } = await supabase
        .from('categorization_patterns')
        .select(`
          id,
          pattern,
          category_id,
          confidence_score,
          category:categories(id, name, type, color)
        `)
        .eq('user_id', user.id);

      if (patternsError) {
        console.error('[Pattern Matching] Error fetching patterns:', patternsError);
      } else {
        console.log(`[Pattern Matching] Loaded ${patterns?.length || 0} patterns for user ${user.id}`);
      }

      // Transform patterns for PatternMatcher
      const transformedPatterns = (patterns || []).map(p => ({
        id: p.id,
        pattern: p.pattern,
        category_id: p.category_id,
        confidence_score: p.confidence_score,
        category: Array.isArray(p.category) ? p.category[0] : p.category
      }));

      // 6.6. For transactions without good category suggestions, try pattern matching
      for (const match of matches) {
        const description = match.importedTransaction.original_description;

        // If no category suggested yet, or if it's a low confidence match, try patterns
        if (!match.suggestedCategory || match.matchConfidence === 'LOW') {
          const patternMatches = PatternMatcher.matchPatterns(description, transformedPatterns);

          if (patternMatches.length > 0) {
            // Use the best pattern match
            const bestPatternMatch = patternMatches[0];
            console.log(`[Pattern Matching] "${description}" → ${bestPatternMatch.category.name} (confidence: ${bestPatternMatch.confidence})`);

            // Override the suggested category with pattern match
            match.suggestedCategory = bestPatternMatch.category;

            // Add pattern match reason
            if (!match.matchReasons.includes('Pattern match')) {
              match.matchReasons.push(`Pattern match: ${bestPatternMatch.confidence}% confidence`);
            }
          } else {
            console.log(`[Pattern Matching] No pattern match for: "${description}"`);
          }
        }
      }

      // 7. Update imported transactions with match results
      const updatePromises = matches.map(match => {
        if (match.status !== 'unmatched' || match.suggestedCategory) {
          return supabase
            .from('imported_transactions_test')
            .update({
              matched_transaction_id: match.existingTransaction?.id || null,
              match_confidence: match.matchConfidence,
              match_status: match.status,
              match_reasons: match.matchReasons,
              suggested_category_id: match.suggestedCategory?.id || null
            })
            .eq('id', match.importedTransaction.id);
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);

      // 8. Generate matching result
      const matchingStats = TransactionMatcher.getMatchingStats(matches);
      const result: MatchingResult = {
        totalImported: insertedTransactions.length,
        highConfidenceMatches: matchingStats.highConfidence,
        mediumConfidenceMatches: matchingStats.mediumConfidence,
        lowConfidenceMatches: matchingStats.lowConfidence,
        unmatched: matchingStats.unmatched,
        matches: TransactionMatcher.sortMatches(matches)
      };

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['imported-transactions'] });
      
      toast.success(`Successfully imported ${insertedTransactions.length} transactions`);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Import failed: ${errorMessage}`);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    importCSV,
    isProcessing,
    importStats
  };
}

// Hook for fetching imported transactions
export function useImportedTransactions() {
  return useQuery({
    queryKey: ['imported-transactions'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('matched_transactions_view')
        .select('*')
        .order('started_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch imported transactions: ${error.message}`);
      }

      return data as ImportedTransaction[];
    }
  });
}

// Hook for updating match status
export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      importedTransactionId, 
      status, 
      matchedTransactionId,
      notes 
    }: {
      importedTransactionId: string;
      status: 'matched' | 'potential' | 'unmatched' | 'reviewed' | 'verified';
      matchedTransactionId?: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('imported_transactions_test')
        .update({
          match_status: status,
          matched_transaction_id: matchedTransactionId || null,
          reviewed: true,
          verified: status === 'verified',
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', importedTransactionId);

      if (error) {
        throw new Error(`Failed to update match status: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imported-transactions'] });
      toast.success('Match status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update match status: ${error.message}`);
    }
  });
}

// Hook for verifying a match (preserves existing transaction data)
export function useVerifyMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      importedTransactionId, 
      existingTransactionDescription 
    }: {
      importedTransactionId: string;
      existingTransactionDescription: string;
    }) => {
      const verificationNote = `Verified against manual entry: ${existingTransactionDescription}`;
      
      const { error } = await supabase
        .from('imported_transactions_test')
        .update({
          match_status: 'verified',
          verified: true,
          verification_note: verificationNote,
          reviewed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', importedTransactionId);

      if (error) {
        throw new Error(`Failed to verify match: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imported-transactions'] });
      toast.success('Transaction verified - your existing data is preserved');
    },
    onError: (error) => {
      toast.error(`Failed to verify match: ${error.message}`);
    }
  });
}

// Hook for bulk processing matches
export function useBulkProcessMatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      transactionIds, 
      action 
    }: {
      transactionIds: string[];
      action: 'accept' | 'reject';
    }) => {
      const status = action === 'accept' ? 'matched' : 'reviewed';
      
      const { error } = await supabase
        .from('imported_transactions_test')
        .update({
          match_status: status,
          reviewed: true,
          updated_at: new Date().toISOString()
        })
        .in('id', transactionIds);

      if (error) {
        throw new Error(`Failed to bulk process matches: ${error.message}`);
      }

      return { processedCount: transactionIds.length, action };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['imported-transactions'] });
      toast.success(`${result.action === 'accept' ? 'Accepted' : 'Rejected'} ${result.processedCount} matches`);
    },
    onError: (error) => {
      toast.error(`Bulk processing failed: ${error.message}`);
    }
  });
}

// Hook for clearing imported transactions
export function useClearImportedTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('imported_transactions_test')
        .delete();

      if (error) {
        throw new Error(`Failed to clear imported transactions: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imported-transactions'] });
      toast.success('Imported transactions cleared');
    },
    onError: (error) => {
      toast.error(`Failed to clear transactions: ${error.message}`);
    }
  });
}

// Hook for getting import statistics
export function useImportStatistics() {
  return useQuery({
    queryKey: ['import-statistics'],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('imported_transactions_test')
        .select('match_status, match_confidence, revolut_type');

      if (error) {
        throw new Error(`Failed to fetch import statistics: ${error.message}`);
      }

      // Calculate statistics
      const stats = {
        total: data.length,
        byStatus: {
          matched: data.filter(t => t.match_status === 'matched').length,
          potential: data.filter(t => t.match_status === 'potential').length,
          unmatched: data.filter(t => t.match_status === 'unmatched').length,
          reviewed: data.filter(t => t.match_status === 'reviewed').length
        },
        byConfidence: {
          high: data.filter(t => t.match_confidence === 'HIGH').length,
          medium: data.filter(t => t.match_confidence === 'MEDIUM').length,
          low: data.filter(t => t.match_confidence === 'LOW').length
        },
        byType: data.reduce((acc, t) => {
          acc[t.revolut_type] = (acc[t.revolut_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return stats;
    }
  });
}
