'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useDateFilter } from '@/lib/date-filter-context';

interface PersonalBalance {
  spend: number;
  repayment: number;
  net: number;
  spendCount: number;
  repaymentCount: number;
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(filter: string): { start: string; end: string } {
  const now = new Date();
  const today = toDateString(now);

  switch (filter) {
    case 'this-month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toDateString(start), end: today };
    }
    case 'last-month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toDateString(start), end: toDateString(end) };
    }
    case 'last-3-months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return { start: toDateString(start), end: today };
    }
    case 'this-year': {
      // UK financial year — Apr 1 to Mar 31
      const fyStart = now.getMonth() >= 3
        ? new Date(now.getFullYear(), 3, 1)
        : new Date(now.getFullYear() - 1, 3, 1);
      return { start: toDateString(fyStart), end: today };
    }
    case 'year-to-date': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: toDateString(start), end: today };
    }
    case 'all-time':
    default:
      return { start: '1970-01-01', end: today };
  }
}

export function usePersonalBalance() {
  const { user } = useAuth();
  const { dateFilter } = useDateFilter();

  return useQuery<PersonalBalance>({
    queryKey: ['personal-balance', user?.id, dateFilter],
    enabled: !!user?.id,
    queryFn: async () => {
      const supabase = createClient();
      const { start, end } = getDateRange(dateFilter);

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, categories:category_id(name)')
        .eq('type', 'capital')
        .gte('transaction_date', start)
        .lte('transaction_date', end);

      if (error) throw error;

      let spend = 0;
      let repayment = 0;
      let spendCount = 0;
      let repaymentCount = 0;

      for (const row of data || []) {
        const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
        const name = cat?.name;
        const amount = Number(row.amount);
        if (name === 'Personal Spend') {
          spend += amount;
          spendCount += 1;
        } else if (name === 'Personal Repayment') {
          repayment += amount;
          repaymentCount += 1;
        }
      }

      return {
        spend,
        repayment,
        net: spend - repayment,
        spendCount,
        repaymentCount,
      };
    },
  });
}
