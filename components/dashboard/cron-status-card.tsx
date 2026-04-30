'use client';

import { Activity, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLastCronRun } from '@/hooks/use-last-cron-run';

const STALE_HOURS = 36;

interface Props {
  jobName: string;
  label: string;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CronStatusCard({ jobName, label }: Props) {
  const { data: run, isLoading } = useLastCronRun(jobName);

  if (isLoading) {
    return (
      <Card style={{ backgroundColor: '#1e1c27', borderColor: 'transparent' }} className="ring-1 ring-white/5">
        <CardContent className="p-4">
          <div className="h-12 bg-muted/30 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // No runs yet — show neutral "not yet run" state.
  if (!run) {
    return (
      <Card style={{ backgroundColor: '#1e1c27', borderColor: 'transparent' }} className="ring-1 ring-white/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2" style={{ backgroundColor: 'rgba(151, 148, 168, 0.1)' }}>
              <Activity className="h-4 w-4" style={{ color: '#9794a8' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#9794a8' }}>{label}</div>
              <div className="text-sm font-medium" style={{ color: '#cfcdd9' }}>Not yet run</div>
              <div className="text-[11px]" style={{ color: '#9794a8' }}>The launchd job hasn&apos;t fired yet, or hasn&apos;t recorded a run.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ageHours = (Date.now() - new Date(run.finished_at).getTime()) / 3_600_000;
  const stale = ageHours > STALE_HOURS;
  const failed = !run.success;
  const bad = failed || stale;

  const palette = bad
    ? { bg: 'rgba(239, 68, 68, 0.1)', accent: '#ef4444', Icon: XCircle }
    : { bg: 'rgba(16, 185, 129, 0.1)', accent: '#10b981', Icon: CheckCircle2 };

  const headline = failed
    ? 'Last run failed'
    : stale
      ? 'Last run is stale'
      : 'Healthy';

  return (
    <Card style={{ backgroundColor: '#1e1c27', borderColor: 'transparent' }} className="ring-1 ring-white/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md p-2 flex-shrink-0" style={{ backgroundColor: palette.bg }}>
            <palette.Icon className="h-4 w-4" style={{ color: palette.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-xs" style={{ color: '#9794a8' }}>{label}</div>
              {stale && !failed && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide" style={{ color: '#f59e0b' }}>
                  <AlertTriangle className="h-3 w-3" /> stale
                </span>
              )}
            </div>
            <div className="text-sm font-semibold" style={{ color: palette.accent }}>
              {headline} · {formatRelative(run.finished_at)}
            </div>
            <div className="text-[11px]" style={{ color: '#9794a8' }}>
              {formatAbsolute(run.finished_at)}
              {run.summary && ` · ${run.summary}`}
            </div>
            {run.error_message && (
              <div className="text-[11px] mt-1 line-clamp-2" style={{ color: '#fca5a5' }}>
                {run.error_message}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
