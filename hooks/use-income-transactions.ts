'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Transaction } from '@/lib/types';

export function useIncomeTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['income-transactions', user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get all income transactions (shared data model)
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          user_id,
          category_id,
          amount,
          type,
          description,
          transaction_date,
          created_at,
          updated_at,
          category:categories(id, user_id, name, type, color, created_at)
        `)
        .eq('type', 'income')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Transaction type
      const transactions: Transaction[] = data?.map(transaction => ({
        id: transaction.id,
        user_id: transaction.user_id,
        category_id: transaction.category_id,
        amount: Number(transaction.amount),
        type: transaction.type as 'income' | 'expenditure' | 'capital',
        description: transaction.description || '',
        date: transaction.transaction_date, // Map transaction_date to date for consistency
        transaction_date: transaction.transaction_date,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        category: Array.isArray(transaction.category) ? transaction.category[0] : transaction.category,
      })) || [];

      return transactions;
    },
    enabled: !!user?.id, // Only run query when user is authenticated
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useExpenditureTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expenditure-transactions', user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get all expenditure transactions (shared data model)
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          user_id,
          category_id,
          amount,
          type,
          description,
          transaction_date,
          created_at,
          updated_at,
          category:categories(id, user_id, name, type, color, created_at)
        `)
        .eq('type', 'expenditure')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Transaction type
      const transactions: Transaction[] = data?.map(transaction => ({
        id: transaction.id,
        user_id: transaction.user_id,
        category_id: transaction.category_id,
        amount: Number(transaction.amount),
        type: transaction.type as 'income' | 'expenditure' | 'capital',
        description: transaction.description || '',
        date: transaction.transaction_date, // Map transaction_date to date for consistency
        transaction_date: transaction.transaction_date,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        category: Array.isArray(transaction.category) ? transaction.category[0] : transaction.category,
      })) || [];

      return transactions;
    },
    enabled: !!user?.id, // Only run query when user is authenticated
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
