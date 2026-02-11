'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useDateFilter } from '@/lib/date-filter-context';

interface MonthlyData {
  month: string;
  income: number;
  expenditure: number;
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Returns monthly income/expenditure data for the bar chart.
 *
 * When a date filter is active the query is scoped to that range and the
 * chart shows one bar per calendar month inside the range.  When no filter
 * is set ("all-time") it falls back to the last 3 calendar months.
 */
export function useLastThreeMonths() {
  const { user } = useAuth();
  const { dateFilter, getDateRange, isClient } = useDateFilter();

  return useQuery({
    queryKey: ['last-three-months', user?.id, dateFilter],
    queryFn: async (): Promise<MonthlyData[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { start: filterStart, end: filterEnd } = getDateRange();

      // Determine the query window
      const now = new Date();
      let rangeStart: Date;
      let rangeEnd: Date;

      if (filterStart && filterEnd) {
        rangeStart = filterStart;
        rangeEnd = filterEnd;
      } else {
        // Fallback: last 3 months
        rangeStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        rangeEnd = now;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, transaction_date')
        .in('type', ['income', 'expenditure'])
        .gte('transaction_date', toDateString(rangeStart))
        .lte('transaction_date', toDateString(rangeEnd))
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      // Build ordered list of months in the range
      const monthlyMap = new Map<string, { income: number; expenditure: number }>();
      const monthKeys: string[] = [];

      const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

      while (cursor <= endMonth) {
        const key = cursor.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        monthKeys.push(key);
        monthlyMap.set(key, { income: 0, expenditure: 0 });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      // Aggregate data into the monthly buckets
      data?.forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        const key = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

        if (monthlyMap.has(key)) {
          const monthData = monthlyMap.get(key)!;
          if (transaction.type === 'income') {
            monthData.income += Number(transaction.amount);
          } else if (transaction.type === 'expenditure') {
            monthData.expenditure += Number(transaction.amount);
          }
        }
      });

      // Convert to array preserving chronological order
      return monthKeys.map(key => ({
        month: key,
        ...monthlyMap.get(key)!,
      }));
    },
    enabled: !!user?.id && isClient,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
