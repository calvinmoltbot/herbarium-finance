#!/usr/bin/env tsx
/**
 * Phase A gmail classifier — issue #13
 *
 * Reads recent purchase emails from Debbie's gmail (via gog), classifies
 * each with OpenRouter, persists the suggestion to email_classifications.
 *
 * Usage:
 *   pnpm classify-emails            # full run
 *   pnpm classify-emails --dry-run  # fetch + classify, no DB writes
 *
 * Idempotent: re-runs skip already-classified messages via UNIQUE
 * (user_id, gmail_msg_id).
 */

import { LOOKBACK_DAYS, MAX_PER_VENDOR, VENDORS, OPENROUTER_MODEL } from './config';
import { searchThreads, getThreadMessages, getHeaders, getBodyText } from './gog';
import { classifyEmail } from './openrouter';
import { persistClassification, getKnownMessageIds, recordCronRun } from './db';
import { runMatchingPass } from './matching';
import type { GmailMessage } from './types';

const JOB_NAME = 'gmail-classifier';

const DRY_RUN = process.argv.includes('--dry-run');

interface VendorStats {
  name: string;
  fetched: number;
  skipped: number;       // already classified, no LLM call made
  classified: number;
  inserted: number;
  duplicates: number;    // raced through LLM but lost to DB unique (rare)
  errors: number;
  cost_usd: number;
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

async function processVendor(
  vendor: { query: string; name: string },
  knownIds: Set<string>,
): Promise<VendorStats> {
  const stats: VendorStats = {
    name: vendor.name,
    fetched: 0, skipped: 0, classified: 0, inserted: 0, duplicates: 0, errors: 0, cost_usd: 0,
  };

  const fullQuery = `${vendor.query} newer_than:${LOOKBACK_DAYS}d`;
  const threadIds = await searchThreads(fullQuery, MAX_PER_VENDOR);
  stats.fetched = threadIds.length;

  for (const threadId of threadIds) {
    const messages = await getThreadMessages(threadId);
    // Use the first message of the thread (the order confirmation usually).
    const msg: GmailMessage | undefined = messages[0];
    if (!msg) continue;

    // Pre-flight: skip if already classified (saves the LLM call entirely).
    // DRY_RUN bypasses this — useful for re-inspecting decisions on known emails.
    if (!DRY_RUN && knownIds.has(msg.id)) {
      stats.skipped += 1;
      continue;
    }

    const headers = getHeaders(msg);
    const body = getBodyText(msg, 4096);
    const receivedAt = new Date(Number(msg.internalDate)).toISOString();

    const { result, usage } = await classifyEmail({
      from: headers.From ?? 'unknown',
      subject: headers.Subject ?? '',
      date: headers.Date ?? '',
      body,
    });

    stats.classified += 1;
    stats.cost_usd += usage.cost_usd ?? 0;
    if (!usage.success) stats.errors += 1;

    if (DRY_RUN) {
      console.log(`  [dry] ${vendor.name} ${msg.id.slice(0, 10)}… "${(headers.Subject ?? '').slice(0, 60)}"`);
      if (usage.success) {
        console.log(`        → ${JSON.stringify(result)}`);
      } else {
        console.log(`        × ${usage.error_message}`);
      }
      continue;
    }

    try {
      const { inserted } = await persistClassification(
        {
          gmail_msg_id: msg.id,
          thread_id: msg.threadId,
          received_at: receivedAt,
          sender: headers.From ?? null,
          result,
          raw_excerpt: body.slice(0, 500),
          classification_error: usage.error_message,
        },
        usage,
      );
      if (inserted) stats.inserted += 1;
      else stats.duplicates += 1;
    } catch (e) {
      stats.errors += 1;
      console.error(`  ! persist failed for ${msg.id}: ${(e as Error).message}`);
    }
  }

  return stats;
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`gmail-classifier ${DRY_RUN ? '(DRY-RUN)' : ''} — model=${OPENROUTER_MODEL}, lookback=${LOOKBACK_DAYS}d, max-per-vendor=${MAX_PER_VENDOR}`);

  let totals = { fetched: 0, skipped: 0, classified: 0, inserted: 0, duplicates: 0, errors: 0, cost_usd: 0 };
  let matchedCount = 0;
  let summary = '';
  let success = true;
  let errorMessage: string | null = null;

  try {
    // Pre-flight: pull known message IDs once, share across vendors.
    const knownIds = DRY_RUN ? new Set<string>() : await getKnownMessageIds();
    if (knownIds.size > 0) console.log(`(${knownIds.size} already-classified messages will be skipped)`);

    const allStats: VendorStats[] = [];
    const vendorErrors: string[] = [];
    for (const vendor of VENDORS) {
      process.stdout.write(`→ ${vendor.name}: `);
      try {
        const stats = await processVendor(vendor, knownIds);
        allStats.push(stats);
        console.log(`${stats.fetched} fetched, ${stats.skipped} skipped, ${stats.classified} classified, ${stats.inserted} new, ${stats.errors} err, $${fmt(stats.cost_usd)}`);
      } catch (e) {
        const msg = (e as Error).message;
        vendorErrors.push(`${vendor.name}: ${msg}`);
        console.log(`! ${msg}`);
      }
    }

    // Fail loud: if every vendor errored, the whole run failed (almost
    // certainly an auth/connectivity issue, not a per-message hiccup).
    if (vendorErrors.length > 0 && allStats.length === 0) {
      throw new Error(`all vendors failed: ${vendorErrors.join(' | ')}`);
    }

    totals = allStats.reduce(
      (acc, s) => ({
        fetched: acc.fetched + s.fetched,
        skipped: acc.skipped + s.skipped,
        classified: acc.classified + s.classified,
        inserted: acc.inserted + s.inserted,
        duplicates: acc.duplicates + s.duplicates,
        errors: acc.errors + s.errors,
        cost_usd: acc.cost_usd + s.cost_usd,
      }),
      { fetched: 0, skipped: 0, classified: 0, inserted: 0, duplicates: 0, errors: 0, cost_usd: 0 },
    );
    console.log(`\nTotal: ${totals.fetched} fetched, ${totals.skipped} skipped, ${totals.classified} classified, ${totals.inserted} new, ${totals.errors} err, $${fmt(totals.cost_usd)}`);

    if (!DRY_RUN) {
      const m = await runMatchingPass();
      matchedCount = m.matched;
      console.log(`Matching: ${m.considered} considered, ${m.matched} matched, ${m.ambiguous} ambiguous, ${m.no_candidate} no candidate`);
      summary = `${totals.inserted} new, ${m.matched}/${m.considered} matched, $${fmt(totals.cost_usd)}`;
    } else {
      summary = `(dry-run) ${totals.classified} classified, $${fmt(totals.cost_usd)}`;
    }
  } catch (e) {
    success = false;
    errorMessage = (e as Error).message;
    console.error('run failed:', errorMessage);
  }

  // Always record the run, success or failure, unless this is a dry-run.
  if (!DRY_RUN) {
    await recordCronRun({
      job_name: JOB_NAME,
      started_at: startedAt,
      success,
      summary,
      error_message: errorMessage,
      classified: totals.classified,
      inserted: totals.inserted,
      matched: matchedCount,
      cost_usd: totals.cost_usd,
    });
  }

  if (!success) process.exit(1);
}

main().catch(async (e) => {
  console.error('fatal:', e);
  // Best-effort death notice. Started_at is approximate.
  try {
    await recordCronRun({
      job_name: JOB_NAME,
      started_at: new Date().toISOString(),
      success: false,
      summary: null,
      error_message: `uncaught: ${(e as Error).message}`,
    });
  } catch { /* swallow — already exiting nonzero */ }
  process.exit(1);
});
