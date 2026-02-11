'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useDateFilter } from '@/lib/date-filter-context';
import type { Transaction } from '@/lib/types';

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useRecentTransactions() {
  const { user } = useAuth();
  const { dateFilter, getDateRange, isClient } = useDateFilter();

  return useQuery({
    queryKey: ['recent-transactions', user?.id, dateFilter],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { start, end } = getDateRange();

      // Build query
      let query = supabase
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

      // Apply date range filter if set
      if (start) {
        query = query.gte('transaction_date', toDateString(start));
      }
      if (end) {
        query = query.lte('transaction_date', toDateString(end));
      }

      const { data, error } = await query;

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
    enabled: !!user?.id && isClient,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
