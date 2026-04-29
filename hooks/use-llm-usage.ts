'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';

export interface LlmUsageStats {
  monthCost: number;
  monthCalls: number;
  lifetimeCost: number;
  lifetimeCalls: number;
  matchedTransactions: number;
}

export function useLlmUsage() {
  const { user } = useAuth();

  return useQuery<LlmUsageStats>({
    queryKey: ['llm-usage', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient();
      const monthStart = (() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      })();

      const [{ data: lifetime, error: e1 }, { data: month, error: e2 }, { count: matched, error: e3 }] = await Promise.all([
        supabase.from('llm_usage').select('cost_usd'),
        supabase.from('llm_usage').select('cost_usd').gte('created_at', monthStart),
        supabase
          .from('email_classifications')
          .select('id', { count: 'exact', head: true })
          .not('matched_transaction_id', 'is', null),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      const sum = (rows: { cost_usd: number | null }[] | null) =>
        (rows ?? []).reduce((acc, r) => acc + Number(r.cost_usd ?? 0), 0);

      return {
        monthCost: sum(month),
        monthCalls: month?.length ?? 0,
        lifetimeCost: sum(lifetime),
        lifetimeCalls: lifetime?.length ?? 0,
        matchedTransactions: matched ?? 0,
      };
    },
  });
}
