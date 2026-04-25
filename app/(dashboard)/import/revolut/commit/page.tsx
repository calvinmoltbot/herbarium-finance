'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle, Database, Upload, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCommitImport, useGetCommitPreview } from '@/hooks/use-commit-import';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CommitImportPage() {
  const [previewData, setPreviewData] = useState<{
    totalStaged: number;
    willSkip: number;
    willInsertCandidates: number;
  } | null>(null);

  const commitImport = useCommitImport();
  const getPreview = useGetCommitPreview();
  const router = useRouter();

  useEffect(() => {
    getPreview.mutate(undefined, {
      onSuccess: (data) => setPreviewData(data),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCommit = async () => {
    try {
      await commitImport.mutateAsync();
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (error) {
      console.error('Commit failed:', error);
    }
  };

  if (!previewData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading commit preview...</p>
        </div>
      </div>
    );
  }

  if (previewData.totalStaged === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto py-12 px-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">No staged data found</h1>
            <p className="text-muted-foreground">
              Import a CSV first, then return here to commit it.
            </p>
            <Button asChild>
              <Link href="/import/revolut">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Import
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/import/revolut/reconciliation">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Reconciliation
                </Link>
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Commit Bank Import</h1>
            </div>
            <p className="text-muted-foreground">
              Append new bank transactions to your ledger. Existing data is never touched; duplicates are skipped.
            </p>
          </div>
        </div>

        <Card className="border-emerald-200 bg-emerald-50">
          <div className="p-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-6 w-6 text-emerald-600 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-emerald-800 mb-2">Non-destructive commit</h3>
                <p className="text-emerald-700 mb-2">
                  Existing transactions and categorisations are preserved. Duplicates are detected by
                  bank reference + date + amount and silently skipped.
                </p>
                <p className="text-sm text-emerald-700">
                  A backup is still recommended for any large import — see <Link href="/import/staging" className="underline font-medium">Import Staging</Link>.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-6">Commit Preview</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: '#1e1c27', borderColor: 'transparent' }}>
              <div className="text-2xl font-bold text-foreground">{previewData.totalStaged}</div>
              <div className="text-sm text-muted-foreground">Total staged rows</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700 flex items-center justify-center gap-2">
                <Upload className="h-5 w-5" />
                {previewData.willInsertCandidates}
              </div>
              <div className="text-sm text-emerald-600">Candidates to insert</div>
              <div className="text-xs text-emerald-500 mt-1">final count after dedup may be lower</div>
            </div>
            <div className="bg-muted border border-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{previewData.willSkip}</div>
              <div className="text-sm text-muted-foreground">Will skip (already matched)</div>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/import/revolut/reconciliation">
              <Eye className="h-4 w-4 mr-2" />
              Review Matches Again
            </Link>
          </Button>

          <Button
            onClick={handleCommit}
            disabled={commitImport.isPending}
          >
            {commitImport.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Committing...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Commit (skip duplicates)
              </>
            )}
          </Button>
        </div>

        {commitImport.isSuccess && (
          <Card className="border-green-200 bg-green-50">
            <div className="p-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Import committed</h3>
                  <p className="text-green-700">
                    Redirecting to dashboard…
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
