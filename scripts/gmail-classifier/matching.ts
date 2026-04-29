// Matching pass — link email_classifications to transactions on (amount, date ±3d).
//
// Phase A scoring (issue #13):
//   amount must equal exactly (no fuzz)
//   |date diff| 0 → 1.00, 1 → 0.85, 2 → 0.70, 3 → 0.55
//   type filter: expenditure only (purchase emails are expenses)
//
// We only persist the match if there is a single best candidate above the
// threshold. Ambiguous matches (two transactions tied on score) are left
// unmatched — the user resolves them manually.

import { getServiceClient } from './db';
import { TARGET_USER_ID } from './config';

const WINDOW_DAYS = 3;
const MIN_SCORE = 0.55;

interface Classification {
  id: string;
  amount: number;
  email_date: string; // YYYY-MM-DD
}

interface Candidate {
  id: string;
  transaction_date: string;
  amount: number;
}

export interface MatchingStats {
  considered: number;
  matched: number;
  ambiguous: number;
  no_candidate: number;
}

function scoreFor(diffDays: number): number {
  const d = Math.abs(diffDays);
  if (d === 0) return 1.0;
  if (d === 1) return 0.85;
  if (d === 2) return 0.70;
  if (d === 3) return 0.55;
  return 0;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(ms / 86_400_000);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function runMatchingPass(): Promise<MatchingStats> {
  const supabase = getServiceClient();
  const stats: MatchingStats = { considered: 0, matched: 0, ambiguous: 0, no_candidate: 0 };

  // Pull all unmatched classifications with the data we need to match on.
  const { data: classifications, error } = await supabase
    .from('email_classifications')
    .select('id, amount, email_date')
    .eq('user_id', TARGET_USER_ID)
    .is('matched_transaction_id', null)
    .not('amount', 'is', null)
    .not('email_date', 'is', null);
  if (error) throw error;

  const rows = (classifications ?? []) as Classification[];
  stats.considered = rows.length;

  for (const c of rows) {
    const lo = shiftDate(c.email_date, -WINDOW_DAYS);
    const hi = shiftDate(c.email_date, WINDOW_DAYS);

    const { data: candidates, error: cErr } = await supabase
      .from('transactions')
      .select('id, transaction_date, amount')
      .eq('user_id', TARGET_USER_ID)
      .eq('type', 'expenditure')
      .eq('amount', c.amount)
      .gte('transaction_date', lo)
      .lte('transaction_date', hi);
    if (cErr) throw cErr;

    const cands = (candidates ?? []) as Candidate[];
    if (cands.length === 0) {
      stats.no_candidate += 1;
      continue;
    }

    const scored = cands
      .map((tx) => ({ tx, score: scoreFor(daysBetween(tx.transaction_date, c.email_date)) }))
      .filter((s) => s.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      stats.no_candidate += 1;
      continue;
    }

    // Ambiguous: top two share the same score → don't guess
    if (scored.length > 1 && scored[0].score === scored[1].score) {
      stats.ambiguous += 1;
      continue;
    }

    const best = scored[0];
    const { error: uErr } = await supabase
      .from('email_classifications')
      .update({
        matched_transaction_id: best.tx.id,
        match_score: best.score,
      })
      .eq('id', c.id);
    if (uErr) throw uErr;
    stats.matched += 1;
  }

  return stats;
}

// Allow running standalone: `tsx scripts/gmail-classifier/matching.ts`
if (require.main === module) {
  runMatchingPass()
    .then((s) => {
      console.log(
        `matching: ${s.considered} considered, ${s.matched} matched, ${s.ambiguous} ambiguous, ${s.no_candidate} no candidate`,
      );
    })
    .catch((e) => {
      console.error('fatal:', e);
      process.exit(1);
    });
}
