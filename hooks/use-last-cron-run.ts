'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';

export interface CronRun {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string;
  success: boolean;
  summary: string | null;
  error_message: string | null;
  classified: number | null;
  inserted: number | null;
  matched: number | null;
  cost_usd: number | null;
}

/**
 * Fetch the most recent cron_runs row for a given job. Returns null if no
 * runs have happened yet. UI is responsible for flagging stale runs (a run
 * older than ~36h while the cron is supposed to be daily indicates trouble).
 */
export function useLastCronRun(jobName: string) {
  const { user } = useAuth();

  return useQuery<CronRun | null>({
    queryKey: ['last-cron-run', jobName, user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cron_runs')
        .select('*')
        .eq('job_name', jobName)
        .order('finished_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as CronRun | undefined) ?? null;
    },
  });
}
