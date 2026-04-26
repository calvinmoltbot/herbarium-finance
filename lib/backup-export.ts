'use client';

import { createClient } from '@/supabase/client';

export interface BackupSnapshot {
  meta: {
    version: 1;
    exported_at: string;
    user_id: string;
    user_email: string | null;
    counts: Record<string, number>;
  };
  data: {
    categories: unknown[];
    category_hierarchies: unknown[];
    category_hierarchy_assignments: unknown[];
    categorization_patterns: unknown[];
    transactions: unknown[];
    transaction_metadata: unknown[];
  };
}

const TABLES = [
  'categories',
  'category_hierarchies',
  'category_hierarchy_assignments',
  'categorization_patterns',
  'transactions',
  'transaction_metadata',
] as const;

export async function buildBackupSnapshot(
  userId: string,
  userEmail: string | null
): Promise<BackupSnapshot> {
  const supabase = createClient();
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    const { data: rows, error } = await supabase.from(table).select('*');
    if (error) {
      throw new Error(`Failed to read ${table}: ${error.message}`);
    }
    data[table] = rows ?? [];
    counts[table] = rows?.length ?? 0;
  }

  return {
    meta: {
      version: 1,
      exported_at: new Date().toISOString(),
      user_id: userId,
      user_email: userEmail,
      counts,
    },
    data: data as BackupSnapshot['data'],
  };
}

export function downloadJSON(snapshot: BackupSnapshot): string {
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().split('T')[0];
  const filename = `herbarium-backup-${date}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}
