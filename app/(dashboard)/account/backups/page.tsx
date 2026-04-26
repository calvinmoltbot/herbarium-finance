'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PageLayout, PageSection, PageCard } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Database, Download, FileJson, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { buildBackupSnapshot, downloadJSON } from '@/lib/backup-export';
import { CSVExporter } from '@/lib/csv-export';
import { createClient } from '@/supabase/client';

export default function BackupsPage() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [lastBackup, setLastBackup] = useState<{ filename: string; counts: Record<string, number> } | null>(null);

  if (!user) {
    return (
      <PageLayout title="Backups & Export" description="Sign in to manage your data" icon={Database}>
        <PageCard>
          <p className="text-center text-muted-foreground">Please log in to access backups.</p>
        </PageCard>
      </PageLayout>
    );
  }

  const handleJSONBackup = async () => {
    setExporting('json');
    try {
      const snapshot = await buildBackupSnapshot(user.id, user.email ?? null);
      const filename = downloadJSON(snapshot);
      setLastBackup({ filename, counts: snapshot.meta.counts });
      toast.success(`Backup downloaded: ${filename}`);
    } catch (err) {
      console.error('Backup failed:', err);
      toast.error(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setExporting(null);
    }
  };

  const handleCSVExport = async () => {
    setExporting('csv');
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(name, type), metadata:transaction_metadata(*)')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info('No transactions to export.');
        return;
      }

      const normalized = data.map((row) => ({
        ...row,
        category: Array.isArray(row.category) ? row.category[0] : row.category,
        metadata: Array.isArray(row.metadata) ? row.metadata[0] : row.metadata,
      }));

      CSVExporter.exportTransactions(normalized);
      toast.success(`Exported ${normalized.length} transactions to CSV`);
    } catch (err) {
      console.error('CSV export failed:', err);
      toast.error(err instanceof Error ? err.message : 'CSV export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <PageLayout
      title="Backups & Export"
      description="Download a snapshot of your data — never lose a transaction"
      icon={Database}
      actions={
        <Link href="/account">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Account
          </Button>
        </Link>
      }
    >
      <PageSection
        title="Full backup (JSON)"
        description="Complete snapshot of your transactions, categories, hierarchies and patterns. Use this for disaster recovery."
        icon={FileJson}
      >
        <PageCard>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Downloads a single <code className="text-xs px-1.5 py-0.5 rounded bg-muted">.json</code> file containing every row
              you own across all data tables. Restore tooling is not yet built — keep the file safe.
            </p>
            <Button onClick={handleJSONBackup} disabled={exporting !== null}>
              <Download className="h-4 w-4 mr-2" />
              {exporting === 'json' ? 'Building backup…' : 'Download JSON backup'}
            </Button>
            {lastBackup && (
              <div className="text-xs space-y-1 pt-3 border-t border-border">
                <p className="text-muted-foreground">Last backup: <span className="font-mono text-foreground">{lastBackup.filename}</span></p>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-muted-foreground">
                  {Object.entries(lastBackup.counts).map(([table, count]) => (
                    <li key={table}>
                      <span className="font-mono">{table}</span>: <span className="text-foreground">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PageCard>
      </PageSection>

      <PageSection
        title="Transactions CSV"
        description="Spreadsheet-friendly export of your transactions for accountants, analysis or archive."
        icon={FileSpreadsheet}
      >
        <PageCard>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Includes date, description, amount, category, notes and tags. Opens cleanly in Numbers, Excel and Google Sheets.
            </p>
            <Button variant="outline" onClick={handleCSVExport} disabled={exporting !== null}>
              <Download className="h-4 w-4 mr-2" />
              {exporting === 'csv' ? 'Exporting…' : 'Download transactions CSV'}
            </Button>
          </div>
        </PageCard>
      </PageSection>
    </PageLayout>
  );
}
