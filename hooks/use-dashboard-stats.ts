'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useDateFilter } from '@/lib/date-filter-context';

interface DashboardStats {
  totalIncome: number;
  totalExpenditure: number;
  netBalance: number;
  currentMonthIncome: number;
  currentMonthExpenditure: number;
  previousMonthIncome: number;
  previousMonthExpenditure: number;
  incomeChange: number;
  expenditureChange: number;
  balanceChange: number;
}

/** Sum transactions by type for a given date range using a single query */
async function getTypeTotals(
  supabase: ReturnType<typeof createClient>,
  startDate: string,
  endDate: string
): Promise<{ income: number; expenditure: number }> {
  // Fetch only the fields needed for aggregation, filtered at DB level
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .in('type', ['income', 'expenditure'])
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) throw error;

  let income = 0;
  let expenditure = 0;
  for (const row of data || []) {
    const amount = Number(row.amount);
    if (row.type === 'income') income += amount;
    else if (row.type === 'expenditure') expenditure += amount;
  }

  return { income, expenditure };
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useDashboardStats() {
  const { user } = useAuth();
  const { dateFilter, getDateRange, isClient } = useDateFilter();

  return useQuery({
    queryKey: ['dashboard-stats', user?.id, dateFilter],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { start: filterStart, end: filterEnd } = getDateRange();

      // Current and previous month boundaries
      const now = new Date();
      const currentMonthStart = toDateString(new Date(now.getFullYear(), now.getMonth(), 1));
      const currentMonthEnd = toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      const previousMonthStart = toDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const previousMonthEnd = toDateString(new Date(now.getFullYear(), now.getMonth(), 0));

      // Run queries in parallel — each fetches only what's needed
      const queries: [
        Promise<{ income: number; expenditure: number }>,
        Promise<{ income: number; expenditure: number }>,
        Promise<{ income: number; expenditure: number }>
      ] = [
        // Current month totals
        getTypeTotals(supabase, currentMonthStart, currentMonthEnd),
        // Previous month totals
        getTypeTotals(supabase, previousMonthStart, previousMonthEnd),
        // Filtered period totals (or all-time)
        filterStart && filterEnd
          ? getTypeTotals(supabase, toDateString(filterStart), toDateString(filterEnd))
          : getTypeTotals(supabase, '2000-01-01', toDateString(now)),
      ];

      const [currentMonth, previousMonth, filtered] = await Promise.all(queries);

      // Calculate percentage changes
      const incomeChange = previousMonth.income > 0
        ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100
        : currentMonth.income > 0 ? 100 : 0;

      const expenditureChange = previousMonth.expenditure > 0
        ? ((currentMonth.expenditure - previousMonth.expenditure) / previousMonth.expenditure) * 100
        : currentMonth.expenditure > 0 ? 100 : 0;

      const previousBalance = previousMonth.income - previousMonth.expenditure;
      const currentBalance = currentMonth.income - currentMonth.expenditure;
      const balanceChange = previousBalance !== 0
        ? ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100
        : currentBalance > 0 ? 100 : currentBalance < 0 ? -100 : 0;

      return {
        totalIncome: filtered.income,
        totalExpenditure: filtered.expenditure,
        netBalance: filtered.income - filtered.expenditure,
        currentMonthIncome: currentMonth.income,
        currentMonthExpenditure: currentMonth.expenditure,
        previousMonthIncome: previousMonth.income,
        previousMonthExpenditure: previousMonth.expenditure,
        incomeChange,
        expenditureChange,
        balanceChange,
      };
    },
    enabled: !!user?.id && isClient,
    staleTime: 5 * 60 * 1000,
  });
}
