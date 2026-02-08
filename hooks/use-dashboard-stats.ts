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
      
      // Get current month dates for comparison calculations
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Get previous month dates for comparison
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get all transactions (shared data model)
      let query = supabase
        .from('transactions')
        .select('amount, type, transaction_date');

      // Apply date filter if not "all-time"
      if (filterStart && filterEnd) {
        query = query
          .gte('transaction_date', filterStart.toISOString().split('T')[0])
          .lte('transaction_date', filterEnd.toISOString().split('T')[0]);
      }

      const { data: filteredTransactions, error: filteredError } = await query;
      if (filteredError) throw filteredError;

      // Get all transactions for comparison calculations (always needed for month-over-month)
      const { data: allTransactions, error: allError } = await supabase
        .from('transactions')
        .select('amount, type, transaction_date');

      if (allError) throw allError;

      // Calculate totals for the filtered period
      const totalIncome = filteredTransactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      const totalExpenditure = filteredTransactions
        ?.filter(t => t.type === 'expenditure')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Calculate current month totals (for comparison, always use actual current month)
      const currentMonthTransactions = allTransactions?.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd;
      }) || [];

      const currentMonthIncome = currentMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const currentMonthExpenditure = currentMonthTransactions
        .filter(t => t.type === 'expenditure')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Calculate previous month totals (for comparison)
      const previousMonthTransactions = allTransactions?.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate >= previousMonthStart && transactionDate <= previousMonthEnd;
      }) || [];

      const previousMonthIncome = previousMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const previousMonthExpenditure = previousMonthTransactions
        .filter(t => t.type === 'expenditure')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Calculate percentage changes
      const incomeChange = previousMonthIncome > 0 
        ? ((currentMonthIncome - previousMonthIncome) / previousMonthIncome) * 100
        : currentMonthIncome > 0 ? 100 : 0;

      const expenditureChange = previousMonthExpenditure > 0 
        ? ((currentMonthExpenditure - previousMonthExpenditure) / previousMonthExpenditure) * 100
        : currentMonthExpenditure > 0 ? 100 : 0;

      const previousBalance = previousMonthIncome - previousMonthExpenditure;
      const currentBalance = currentMonthIncome - currentMonthExpenditure;
      const balanceChange = previousBalance !== 0 
        ? ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100
        : currentBalance > 0 ? 100 : currentBalance < 0 ? -100 : 0;

      return {
        totalIncome,
        totalExpenditure,
        netBalance: totalIncome - totalExpenditure,
        currentMonthIncome,
        currentMonthExpenditure,
        previousMonthIncome,
        previousMonthExpenditure,
        incomeChange,
        expenditureChange,
        balanceChange,
      };
    },
    enabled: !!user?.id && isClient, // Only run query when user is authenticated and on client
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
