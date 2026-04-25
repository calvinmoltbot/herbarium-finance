// Hook for committing staged Revolut imports as new transactions.
//
// Non-destructive: existing transactions and their categories are never touched.
// Staged rows are inserted only if they don't already exist in the live table,
// using two layers of dedup:
//   1. match_status from the import-time matcher (matched/verified/potential = skip)
//   2. (bank_reference, transaction_date, amount) lookup against live transactions

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { toast } from 'sonner';

const supabase = createClient();

type DedupKey = string;
const keyOf = (bankRef: string | null | undefined, date: string, amount: number): DedupKey =>
  `${(bankRef ?? '').trim()}|${date}|${Math.abs(amount).toFixed(2)}`;

const SKIP_STATUSES = new Set(['matched', 'verified', 'potential']);

export function useCommitImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // 1. Fetch all staged rows for this user
      const { data: staged, error: stagedError } = await supabase
        .from('imported_transactions_test')
        .select('id, original_description, amount, started_date, completed_date, match_status, suggested_category_id')
        .eq('user_id', user.id);

      if (stagedError) {
        throw new Error(`Failed to fetch staged transactions: ${stagedError.message}`);
      }
      if (!staged || staged.length === 0) {
        throw new Error('No staged transactions to commit');
      }

      // 2. Build dedup index from live transactions
      const { data: existing, error: existingError } = await supabase
        .from('transactions')
        .select('bank_reference, transaction_date, amount')
        .eq('user_id', user.id);

      if (existingError) {
        throw new Error(`Failed to read live transactions for dedup: ${existingError.message}`);
      }

      const existingKeys = new Set<DedupKey>(
        (existing ?? []).map(t => keyOf(t.bank_reference, t.transaction_date, Number(t.amount)))
      );

      // 3. Decide which staged rows to insert vs skip
      const toInsert: typeof staged = [];
      let skippedByMatch = 0;
      let skippedByDedup = 0;

      for (const row of staged) {
        if (SKIP_STATUSES.has(row.match_status)) {
          skippedByMatch++;
          continue;
        }
        const date = (row.started_date as string).split('T')[0];
        const key = keyOf(row.original_description, date, Number(row.amount));
        if (existingKeys.has(key)) {
          skippedByDedup++;
          continue;
        }
        toInsert.push(row);
        existingKeys.add(key); // guard against intra-batch dupes too
      }

      // 4. Insert new rows
      let inserted = 0;
      if (toInsert.length > 0) {
        const newTransactions = toInsert.map(row => ({
          user_id: user.id,
          description: row.original_description,
          amount: Math.abs(Number(row.amount)),
          transaction_date: (row.started_date as string).split('T')[0],
          type: Number(row.amount) > 0 ? 'income' : 'expenditure',
          category_id: row.suggested_category_id || null,
          bank_reference: row.original_description,
        }));

        const { data: insertedRows, error: insertError } = await supabase
          .from('transactions')
          .insert(newTransactions)
          .select('id');

        if (insertError) {
          throw new Error(`Failed to insert new transactions: ${insertError.message}`);
        }
        inserted = insertedRows?.length ?? 0;
      }

      // 5. Clear staging — non-fatal if it fails
      const { error: clearError } = await supabase
        .from('imported_transactions_test')
        .delete()
        .eq('user_id', user.id);

      if (clearError) {
        console.warn('Failed to clear staging after commit:', clearError.message);
      }

      return {
        inserted,
        skippedByMatch,
        skippedByDedup,
        totalStaged: staged.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['staged-imports'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      const skipped = result.skippedByMatch + result.skippedByDedup;
      toast.success(
        `Imported ${result.inserted} new transaction${result.inserted === 1 ? '' : 's'}. ` +
        `Skipped ${skipped} duplicate${skipped === 1 ? '' : 's'} (${result.skippedByMatch} matched, ${result.skippedByDedup} dedup'd).`
      );
    },
    onError: (error) => {
      toast.error(`Failed to commit import: ${error.message}`);
    },
  });
}

export function useGetCommitPreview() {
  return useMutation({
    mutationFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: staged, error: stagedError } = await supabase
        .from('imported_transactions_test')
        .select('match_status')
        .eq('user_id', user.id);

      if (stagedError) {
        throw new Error(`Failed to fetch staged transactions: ${stagedError.message}`);
      }

      const totalStaged = staged?.length ?? 0;
      const willSkip = (staged ?? []).filter(r => SKIP_STATUSES.has(r.match_status)).length;
      const willInsertCandidates = totalStaged - willSkip;

      return {
        totalStaged,
        willSkip,
        willInsertCandidates,
      };
    },
  });
}
