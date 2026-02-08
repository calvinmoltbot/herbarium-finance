'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface ResetResult {
  transactionsDeleted: number;
  categoriesDeleted: number;
  success: boolean;
  errors: string[];
}

export function useDataReset() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isResetting, setIsResetting] = useState(false);

  const resetTransactions = async (): Promise<ResetResult> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsResetting(true);

    try {
      const supabase = createClient();
      const result: ResetResult = {
        transactionsDeleted: 0,
        categoriesDeleted: 0,
        success: false,
        errors: [],
      };

      // First, get count of existing transactions
      const { count: transactionCount, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        result.errors.push(`Error counting transactions: ${countError.message}`);
        return result;
      }

      // Delete all transactions for the user
      const { error: deleteTransactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      if (deleteTransactionsError) {
        result.errors.push(`Error deleting transactions: ${deleteTransactionsError.message}`);
        return result;
      }

      result.transactionsDeleted = transactionCount || 0;

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-data'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });

      result.success = true;
      return result;
    } finally {
      setIsResetting(false);
    }
  };

  const resetCategories = async (): Promise<ResetResult> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsResetting(true);

    try {
      const supabase = createClient();
      const result: ResetResult = {
        transactionsDeleted: 0,
        categoriesDeleted: 0,
        success: false,
        errors: [],
      };

      // First, get count of existing categories
      const { count: categoryCount, error: countError } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        result.errors.push(`Error counting categories: ${countError.message}`);
        return result;
      }

      // Delete all categories for the user
      const { error: deleteCategoriesError } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', user.id);

      if (deleteCategoriesError) {
        result.errors.push(`Error deleting categories: ${deleteCategoriesError.message}`);
        return result;
      }

      result.categoriesDeleted = categoryCount || 0;

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });

      result.success = true;
      return result;
    } finally {
      setIsResetting(false);
    }
  };

  const resetAllData = async (): Promise<ResetResult> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsResetting(true);

    try {
      const supabase = createClient();
      const result: ResetResult = {
        transactionsDeleted: 0,
        categoriesDeleted: 0,
        success: false,
        errors: [],
      };

      // Get counts first
      const { count: transactionCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: categoryCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Delete transactions first (due to foreign key constraints)
      const { error: deleteTransactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      if (deleteTransactionsError) {
        result.errors.push(`Error deleting transactions: ${deleteTransactionsError.message}`);
        return result;
      }

      result.transactionsDeleted = transactionCount || 0;

      // Then delete categories
      const { error: deleteCategoriesError } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', user.id);

      if (deleteCategoriesError) {
        result.errors.push(`Error deleting categories: ${deleteCategoriesError.message}`);
        return result;
      }

      result.categoriesDeleted = categoryCount || 0;

      // Invalidate all queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-data'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });

      result.success = true;
      return result;
    } finally {
      setIsResetting(false);
    }
  };

  const resetTransactionsMutation = useMutation({
    mutationFn: resetTransactions,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Successfully deleted ${result.transactionsDeleted} transactions!`);
      } else {
        toast.error('Failed to reset transactions');
      }
    },
    onError: (error: Error) => {
      console.error('Transaction reset failed:', error);
      toast.error('Failed to reset transactions. Please try again.');
    },
  });

  const resetCategoriesMutation = useMutation({
    mutationFn: resetCategories,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Successfully deleted ${result.categoriesDeleted} categories!`);
      } else {
        toast.error('Failed to reset categories');
      }
    },
    onError: (error: Error) => {
      console.error('Category reset failed:', error);
      toast.error('Failed to reset categories. Please try again.');
    },
  });

  const resetAllMutation = useMutation({
    mutationFn: resetAllData,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Successfully deleted ${result.transactionsDeleted} transactions and ${result.categoriesDeleted} categories!`);
      } else {
        toast.error('Failed to reset all data');
      }
    },
    onError: (error: Error) => {
      console.error('Data reset failed:', error);
      toast.error('Failed to reset data. Please try again.');
    },
  });

  return {
    resetTransactions: () => resetTransactionsMutation.mutateAsync(),
    resetCategories: () => resetCategoriesMutation.mutateAsync(),
    resetAllData: () => resetAllMutation.mutateAsync(),
    isResetting: isResetting || resetTransactionsMutation.isPending || resetCategoriesMutation.isPending || resetAllMutation.isPending,
    error: resetTransactionsMutation.error || resetCategoriesMutation.error || resetAllMutation.error,
  };
}
