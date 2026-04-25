'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { PageLayout, PageSection } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Download, Trash2, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';

interface StagedRow {
  id: string;
  started_date: string;
  completed_date: string | null;
  original_description: string;
  amount: number;
  currency: string;
  match_status: string;
  suggested_category_id: string | null;
  created_at: string;
}

const formatGBP = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

export default function ImportStagingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const stagedQuery = useQuery({
    queryKey: ['staged-imports', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<StagedRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('imported_transactions_test')
        .select('id, started_date, completed_date, original_description, amount, currency, match_status, suggested_category_id, created_at')
        .eq('user_id', user!.id)
        .order('started_date', { ascending: false });
      if (error) throw error;
      return (data || []) as StagedRow[];
    },
  });

  const liveCountQuery = useQuery({
    queryKey: ['transactions-count', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      if (error) throw error;
      return count || 0;
    },
  });

  const clearStaging = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('imported_transactions_test')
        .delete()
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Staging cleared');
      setConfirmingClear(false);
      queryClient.invalidateQueries({ queryKey: ['staged-imports'] });
    },
    onError: (err: Error) => toast.error(`Failed to clear: ${err.message}`),
  });

  const handleBackup = async () => {
    if (!user?.id) return;
    setDownloading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });
      if (error) throw error;

      const payload = {
        exportedAt: new Date().toISOString(),
        userId: user.id,
        environment: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') ? 'local' : 'production',
        count: data?.length || 0,
        transactions: data || [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = format(new Date(), 'yyyy-MM-dd-HHmm');
      a.href = url;
      a.download = `herbarium-transactions-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Backed up ${data?.length || 0} transactions`);
    } catch (err) {
      toast.error(`Backup failed: ${(err as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  const rows = stagedQuery.data || [];
  const total = rows.length;
  const dates = rows.map(r => r.started_date).filter(Boolean).sort();
  const dateRange = dates.length ? `${format(new Date(dates[0]), 'dd MMM yyyy')} → ${format(new Date(dates[dates.length - 1]), 'dd MMM yyyy')}` : '—';

  const statusCounts = rows.reduce((acc, r) => {
    acc[r.match_status] = (acc[r.match_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const liveCount = liveCountQuery.data ?? 0;

  return (
    <PageLayout
      title="Import Staging"
      description="Inspect what's queued in the staging table before committing. Committing wipes and replaces all live transactions."
      icon={Database}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/import" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Import</span>
          </Link>
        </Button>
      }
    >
      {/* Behaviour explainer */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm" style={{ color: '#e8e6e3' }}>
            <p className="font-semibold mb-1">Commit is non-destructive</p>
            <p style={{ color: '#9794a8' }}>
              Committing inserts only <em>new</em> staged rows into your live ledger of {liveCount} transactions.
              Duplicates (matched by bank reference + date + amount) are skipped, and existing
              categorisations are never touched. Backup is still recommended before any large import.
            </p>
          </div>
        </div>
      </div>

      <PageSection
        title="Backup live transactions"
        description="Download every transaction currently in your account as a JSON file. Do this before any commit."
        actions={
          <Button onClick={handleBackup} disabled={downloading || liveCountQuery.isLoading}>
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Backup {liveCount} transactions
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          Saves to <code>herbarium-transactions-backup-YYYY-MM-DD-HHMM.json</code>. Tagged with environment ({process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') ? 'local' : 'production'}).
        </p>
      </PageSection>

      <PageSection
        title="Staging summary"
        description="Rows currently sitting in imported_transactions_test"
      >
        {stagedQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : total === 0 ? (
          <p className="text-muted-foreground">Staging is empty. Any new bank import will start fresh.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-foreground">{total}</div>
              <div className="text-sm text-muted-foreground">Staged rows</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{dateRange}</div>
              <div className="text-sm text-muted-foreground">Date range</div>
            </div>
            <div className="col-span-2">
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, n]) => (
                  <Badge key={status} variant="outline">
                    {status}: {n}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground mt-1">By match status</div>
            </div>
          </div>
        )}
      </PageSection>

      {total > 0 && (
        <>
          <PageSection
            title="Preview (newest 50)"
            description="What you'd be replacing your live data with"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2835' }}>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Description</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : '#1a1822' }}>
                      <td className="py-2 px-2 text-foreground whitespace-nowrap">
                        {format(new Date(r.started_date), 'dd MMM yyyy')}
                      </td>
                      <td className="py-2 px-2 text-foreground">{r.original_description}</td>
                      <td className="py-2 px-2 text-right text-foreground tabular-nums">
                        <span style={{ color: r.amount >= 0 ? '#34d399' : '#f87171' }}>
                          {formatGBP(r.amount)}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">{r.match_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {total > 50 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Showing 50 of {total} rows.
                </p>
              )}
            </div>
          </PageSection>

          <PageSection
            title="Clear staging"
            description="Delete all rows from the staging table without committing. Use this if a previous import was abandoned."
            actions={
              !confirmingClear ? (
                <Button variant="outline" onClick={() => setConfirmingClear(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear {total} staged rows
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setConfirmingClear(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => clearStaging.mutate()}
                    disabled={clearStaging.isPending}
                    style={{ backgroundColor: '#dc2626', color: 'white' }}
                  >
                    {clearStaging.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirm: delete all staged rows
                  </Button>
                </div>
              )
            }
          >
            <p className="text-sm text-muted-foreground">
              This only touches <code>imported_transactions_test</code>. Your live <code>transactions</code> table is untouched.
            </p>
          </PageSection>
        </>
      )}
    </PageLayout>
  );
}
