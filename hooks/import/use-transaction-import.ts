'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface TransactionImportData {
  date: string;
  supplier: string;
  description: string;
  amount: number;
  category: string;
  fingerprint: string;
}

interface ImportResult {
  total: number;
  successful: number;
  duplicates: number;
  failed: number;
  strategy: string;
  errors: string[];
  duplicateDetails: any[];
}

export function useTransactionImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  const importTransactions = async (
    transactions: TransactionImportData[], 
    duplicateStrategy: string,
    transactionType: 'income' | 'expenditure'
  ): Promise<ImportResult> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsImporting(true);

    try {
      const supabase = createClient();
      
      // First, ensure the user exists in the public.users table
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create them
        const { error: insertUserError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
          });

        if (insertUserError) {
          throw new Error('Failed to create user record');
        }
      } else if (userError) {
        throw userError;
      }

      // Get existing categories to map category names to IDs
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', user.id)
        .eq('type', transactionType);

      if (categoriesError) {
        throw categoriesError;
      }

      const categoryMap = new Map(
        categories?.map(cat => [cat.name.toLowerCase(), cat.id]) || []
      );

      // Get existing transactions for duplicate detection
      const { data: existingTransactions, error: existingError } = await supabase
        .from('transactions')
        .select('id, transaction_date, description, amount, category_id, user_id')
        .eq('user_id', user.id)
        .eq('type', transactionType);

      if (existingError) {
        throw existingError;
      }

      // Create fingerprints for existing transactions
      const existingFingerprints = new Set(
        existingTransactions?.map(t => {
          const dateKey = t.transaction_date;
          const amountKey = t.amount.toFixed(2);
          const descriptionHash = (t.description || '').toLowerCase().trim().substring(0, 50);
          return `${dateKey}_${amountKey}_${descriptionHash}`;
        }) || []
      );

      const result: ImportResult = {
        total: transactions.length,
        successful: 0,
        duplicates: 0,
        failed: 0,
        strategy: duplicateStrategy,
        errors: [],
        duplicateDetails: [],
      };

      // Process transactions in batches
      const batchSize = 20;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        const transactionsToInsert = [];

        for (const transaction of batch) {
          try {
            // Create enhanced fingerprint for database duplicate detection
            const dateKey = transaction.date;
            const amountKey = transaction.amount.toFixed(2);
            const descriptionHash = transaction.description.toLowerCase().trim().substring(0, 50);
            const dbFingerprint = `${dateKey}_${amountKey}_${descriptionHash}`;

            // Check for duplicates in existing database
            const isDatabaseDuplicate = existingFingerprints.has(dbFingerprint);

            if (isDatabaseDuplicate) {
              result.duplicates++;
              result.duplicateDetails.push({
                transaction,
                reason: 'Found in existing database records',
                fingerprint: dbFingerprint,
              });

              if (duplicateStrategy === 'skip') {
                continue; // Skip this transaction
              }
            }

            // Map category name to category ID
            let categoryId = null;
            if (transaction.category) {
              categoryId = categoryMap.get(transaction.category.toLowerCase());
              if (!categoryId) {
                // Category not found, we could create it or skip
                result.errors.push(`Category "${transaction.category}" not found for transaction on ${transaction.date}`);
              }
            }

            // Prepare transaction for insertion
            const transactionData = {
              user_id: user.id,
              category_id: categoryId,
              amount: transaction.amount,
              type: transactionType,
              description: `${transaction.supplier}${transaction.description ? ` - ${transaction.description}` : ''}`,
              transaction_date: transaction.date,
            };

            transactionsToInsert.push(transactionData);

            // Add to existing fingerprints to prevent duplicates within this import
            existingFingerprints.add(dbFingerprint);

          } catch (error) {
            result.failed++;
            result.errors.push(`Failed to process transaction: ${error}`);
          }
        }

        // Insert the batch
        if (transactionsToInsert.length > 0) {
          const { data, error } = await supabase
            .from('transactions')
            .insert(transactionsToInsert)
            .select();

          if (error) {
            result.failed += transactionsToInsert.length;
            result.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          } else {
            result.successful += data?.length || 0;
          }
        }

        // Add a small delay between batches to avoid overwhelming the database
        if (i + batchSize < transactions.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-data'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });

      return result;
    } finally {
      setIsImporting(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: ({ transactions, duplicateStrategy, transactionType }: { 
      transactions: TransactionImportData[], 
      duplicateStrategy: string,
      transactionType: 'income' | 'expenditure'
    }) => importTransactions(transactions, duplicateStrategy, transactionType),
    onSuccess: (result) => {
      if (result.successful > 0) {
        toast.success(`Successfully imported ${result.successful} transactions!`);
      }
      if (result.duplicates > 0) {
        toast.info(`${result.duplicates} duplicates ${result.strategy === 'skip' ? 'skipped' : 'processed'}`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} transactions`);
      }
    },
    onError: (error: any) => {
      console.error('Transaction import failed:', error);
      toast.error('Failed to import transactions. Please try again.');
    },
  });

  return {
    importTransactions: (transactions: TransactionImportData[], duplicateStrategy: string, transactionType: 'income' | 'expenditure') =>
      importMutation.mutateAsync({ transactions, duplicateStrategy, transactionType }),
    isImporting: isImporting || importMutation.isPending,
    error: importMutation.error,
  };
}

// Utility function to create transaction fingerprint
export function createTransactionFingerprint(
  date: string,
  supplier: string,
  amount: number,
  description?: string
): string {
  const dateKey = date;
  const supplierKey = supplier.toLowerCase().trim();
  const amountKey = amount.toFixed(2);
  const descriptionHash = (description || '').toLowerCase().trim().substring(0, 50);
  
  return `${dateKey}_${supplierKey}_${amountKey}_${descriptionHash}`;
}

// Utility function for fuzzy duplicate detection
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
