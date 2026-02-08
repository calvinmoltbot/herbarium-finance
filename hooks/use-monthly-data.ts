'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { MonthlyData } from '@/lib/types';

export function useMonthlyData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly-data', user?.id],
    queryFn: async (): Promise<MonthlyData[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get transactions from the last 6 months for the authenticated user
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, transaction_date')
        .gte('transaction_date', sixMonthsAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      // Group by month and calculate totals
      const monthlyMap = new Map<string, { income: number; expenditure: number }>();
      
      data?.forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short' });
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { income: 0, expenditure: 0 });
        }
        
        const monthData = monthlyMap.get(monthKey)!;
        if (transaction.type === 'income') {
          monthData.income += Number(transaction.amount);
        } else {
          monthData.expenditure += Number(transaction.amount);
        }
      });

      // Convert to array format
      const result: MonthlyData[] = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        income: data.income,
        expenditure: data.expenditure,
      }));

      // If no data, return empty array
      return result.length > 0 ? result : [];
    },
    enabled: !!user?.id, // Only run query when user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
