'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { CategoryBreakdown } from '@/lib/types';

export function useCategoryBreakdown() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['category-breakdown', user?.id],
    queryFn: async (): Promise<{ income: CategoryBreakdown[]; expenditure: CategoryBreakdown[] }> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get all transactions with categories for the authenticated user
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          amount,
          type,
          category:categories(name, color)
        `)
        ;

      if (error) throw error;

      // Group by category and type
      const incomeMap = new Map<string, { amount: number; color: string }>();
      const expenditureMap = new Map<string, { amount: number; color: string }>();

      data?.forEach(transaction => {
        const category = Array.isArray(transaction.category) ? transaction.category[0] : transaction.category;
        const categoryName = category?.name || 'Uncategorized';
        const categoryColor = category?.color || '#6B7280';
        const amount = Number(transaction.amount);

        if (transaction.type === 'income') {
          const existing = incomeMap.get(categoryName) || { amount: 0, color: categoryColor };
          incomeMap.set(categoryName, {
            amount: existing.amount + amount,
            color: categoryColor,
          });
        } else {
          const existing = expenditureMap.get(categoryName) || { amount: 0, color: categoryColor };
          expenditureMap.set(categoryName, {
            amount: existing.amount + amount,
            color: categoryColor,
          });
        }
      });

      // Calculate totals and percentages
      const totalIncome = Array.from(incomeMap.values()).reduce((sum, cat) => sum + cat.amount, 0);
      const totalExpenditure = Array.from(expenditureMap.values()).reduce((sum, cat) => sum + cat.amount, 0);

      const income: CategoryBreakdown[] = Array.from(incomeMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalIncome > 0 ? Math.round((data.amount / totalIncome) * 100) : 0,
        color: data.color,
      }));

      const expenditure: CategoryBreakdown[] = Array.from(expenditureMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalExpenditure > 0 ? Math.round((data.amount / totalExpenditure) * 100) : 0,
        color: data.color,
      }));

      // Sort by amount (highest first)
      income.sort((a, b) => b.amount - a.amount);
      expenditure.sort((a, b) => b.amount - a.amount);

      return { income, expenditure };
    },
    enabled: !!user?.id, // Only run query when user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
