'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Transaction } from '@/lib/types';

export function useRecentTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-transactions', user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get the 10 most recent transactions (shared data model)
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
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Transform the data to match our Transaction type
      const transactions: Transaction[] = data?.map(transaction => ({
        id: transaction.id,
        user_id: transaction.user_id,
        category_id: transaction.category_id,
        amount: Number(transaction.amount),
        type: transaction.type as 'income' | 'expenditure',
        description: transaction.description || '',
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
