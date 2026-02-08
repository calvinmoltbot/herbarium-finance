// Hook for committing Revolut import as main transaction data

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { toast } from 'sonner';

const supabase = createClient();

export function useCommitImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Start a transaction to ensure data consistency
      // Note: No user_id filter needed due to shared data model - all users can see all transactions
      const { data: importedTransactions, error: fetchError } = await supabase
        .from('matched_transactions_view')
        .select('*');

      if (fetchError) {
        throw new Error(`Failed to fetch imported transactions: ${fetchError.message}`);
      }

      if (!importedTransactions || importedTransactions.length === 0) {
        throw new Error('No imported transactions found to commit');
      }

      // Step 1: Clear foreign key references first, then delete transactions
      const { error: clearRefsError } = await supabase
        .from('imported_transactions_test')
        .update({ matched_transaction_id: null })
        .eq('user_id', user.id);

      if (clearRefsError) {
        throw new Error(`Failed to clear transaction references: ${clearRefsError.message}`);
      }

      // Now delete all existing manual transactions
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(`Failed to delete existing transactions: ${deleteError.message}`);
      }

      // Step 2: Prepare new transactions from imported data
      const newTransactions = importedTransactions.map(imported => {
        // For verified transactions, use the existing description and category
        // For others, use bank description and assigned category (if any)
        const useExistingData = imported.match_status === 'verified' && imported.existing_description;
        
        // Add verification info to description if verified
        let description = useExistingData ? imported.existing_description : imported.original_description;
        if (imported.verification_note) {
          description += ` (${imported.verification_note})`;
        }
        
        return {
          user_id: user.id,
          description: description,
          amount: Math.abs(imported.amount), // Always positive, type determines income/expenditure
          transaction_date: imported.started_date.split('T')[0], // Convert to date only
          type: imported.amount > 0 ? 'income' : 'expenditure',
          category_id: imported.suggested_category_id || null, // Use assigned category from import review
          bank_reference: imported.original_description // Store original bank description for future duplicate detection
        };
      });

      // Step 3: Insert new transactions
      const { data: insertedTransactions, error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactions)
        .select();

      if (insertError) {
        throw new Error(`Failed to insert new transactions: ${insertError.message}`);
      }

      // Step 4: Get categories BEFORE we clear the import data
      const { data: categories, error: categoryError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id);

      if (categoryError) {
        console.warn('Failed to fetch categories for restoration:', categoryError.message);
      }

      // Step 5: For verified transactions, restore category assignments
      const verifiedTransactions = importedTransactions.filter(t => 
        t.match_status === 'verified' && t.existing_category_name
      );

      let categoriesRestored = 0;
      if (verifiedTransactions.length > 0 && categories) {
        const categoryMap = new Map(categories.map(c => [c.name, c.id]));
        
        // Update transactions with category IDs
        for (let i = 0; i < verifiedTransactions.length; i++) {
          const verified = verifiedTransactions[i];
          const categoryId = categoryMap.get(verified.existing_category_name!);
          
          if (categoryId) {
            // Find the corresponding new transaction
            const transactionIndex = importedTransactions.findIndex(t => t.id === verified.id);
            if (transactionIndex >= 0 && insertedTransactions![transactionIndex]) {
              const newTransaction = insertedTransactions![transactionIndex];
              
              const { error: updateError } = await supabase
                .from('transactions')
                .update({ category_id: categoryId })
                .eq('id', newTransaction.id);
              
              if (!updateError) {
                categoriesRestored++;
              } else {
                console.warn(`Failed to restore category for transaction ${newTransaction.id}:`, updateError.message);
              }
            }
          }
        }
      }

      // Step 6: Clear the imported test data (after we've used the category info)
      const { error: clearError } = await supabase
        .from('imported_transactions_test')
        .delete()
        .eq('user_id', user.id);

      if (clearError) {
        // Don't fail the whole operation if clearing fails
        console.warn('Failed to clear imported test data:', clearError.message);
      }

      return {
        totalCommitted: insertedTransactions!.length,
        verifiedWithCategories: verifiedTransactions.length,
        readyForCategorization: insertedTransactions!.length - verifiedTransactions.length
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      toast.success(
        `Import committed! ${result.totalCommitted} transactions imported. ` +
        `${result.verifiedWithCategories} with categories restored, ` +
        `${result.readyForCategorization} ready for categorization.`
      );
    },
    onError: (error) => {
      toast.error(`Failed to commit import: ${error.message}`);
    }
  });
}

export function useGetCommitPreview() {
  return useMutation({
    mutationFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get current manual transactions count
      const { count: manualCount, error: manualError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (manualError) {
        throw new Error(`Failed to count manual transactions: ${manualError.message}`);
      }

      // Get imported transactions breakdown
      const { data: importedTransactions, error: importedError } = await supabase
        .from('imported_transactions_test')
        .select('match_status, verified')
        .eq('user_id', user.id);

      if (importedError) {
        throw new Error(`Failed to fetch imported transactions: ${importedError.message}`);
      }

      const stats = {
        manualTransactionsToDelete: manualCount || 0,
        totalImportedTransactions: importedTransactions?.length || 0,
        verifiedTransactions: importedTransactions?.filter(t => t.match_status === 'verified').length || 0,
        unmatchedTransactions: importedTransactions?.filter(t => t.match_status === 'unmatched').length || 0,
        rejectedTransactions: importedTransactions?.filter(t => t.match_status === 'reviewed').length || 0
      };

      return stats;
    }
  });
}
