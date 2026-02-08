'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';

interface MonthlyData {
  month: string;
  income: number;
  expenditure: number;
}

export function useLastThreeMonths() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['last-three-months', user?.id],
    queryFn: async (): Promise<MonthlyData[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get the last 3 months including current month
      const now = new Date();
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, transaction_date')
        .gte('transaction_date', twoMonthsAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyMap = new Map<string, { income: number; expenditure: number }>();
      
      // Initialize last 3 months including current month
      for (let i = 2; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short' });
        monthlyMap.set(monthKey, { income: 0, expenditure: 0 });
      }

      // Aggregate data
      data?.forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short' });
        
        if (monthlyMap.has(monthKey)) {
          const monthData = monthlyMap.get(monthKey)!;
          if (transaction.type === 'income') {
            monthData.income += Number(transaction.amount);
          } else {
            monthData.expenditure += Number(transaction.amount);
          }
        }
      });

      // Convert to array in chronological order
      const result: MonthlyData[] = [];
      for (let i = 2; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('en-GB', { month: 'short' });
        const monthData = monthlyMap.get(monthKey)!;
        
        result.push({
          month: monthKey,
          income: monthData.income,
          expenditure: monthData.expenditure,
        });
      }

      return result;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
