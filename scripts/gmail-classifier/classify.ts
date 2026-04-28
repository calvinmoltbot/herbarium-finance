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
import { persistClassification } from './db';
import type { GmailMessage } from './types';

const DRY_RUN = process.argv.includes('--dry-run');

interface VendorStats {
  name: string;
  fetched: number;
  classified: number;
  inserted: number;
  duplicates: number;
  errors: number;
  cost_usd: number;
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

async function processVendor(
  vendor: { query: string; name: string },
): Promise<VendorStats> {
  const stats: VendorStats = {
    name: vendor.name,
    fetched: 0, classified: 0, inserted: 0, duplicates: 0, errors: 0, cost_usd: 0,
  };

  const fullQuery = `${vendor.query} newer_than:${LOOKBACK_DAYS}d`;
  const threadIds = await searchThreads(fullQuery, MAX_PER_VENDOR);
  stats.fetched = threadIds.length;

  for (const threadId of threadIds) {
    const messages = await getThreadMessages(threadId);
    // Use the first message of the thread (the order confirmation usually).
    const msg: GmailMessage | undefined = messages[0];
    if (!msg) continue;

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
  console.log(`gmail-classifier ${DRY_RUN ? '(DRY-RUN)' : ''} — model=${OPENROUTER_MODEL}, lookback=${LOOKBACK_DAYS}d, max-per-vendor=${MAX_PER_VENDOR}`);

  const allStats: VendorStats[] = [];
  for (const vendor of VENDORS) {
    process.stdout.write(`→ ${vendor.name}: `);
    try {
      const stats = await processVendor(vendor);
      allStats.push(stats);
      console.log(`${stats.fetched} fetched, ${stats.classified} classified, ${stats.inserted} new, ${stats.duplicates} dup, ${stats.errors} err, $${fmt(stats.cost_usd)}`);
    } catch (e) {
      console.log(`! ${(e as Error).message}`);
    }
  }

  // Totals
  const total = allStats.reduce(
    (acc, s) => ({
      fetched: acc.fetched + s.fetched,
      classified: acc.classified + s.classified,
      inserted: acc.inserted + s.inserted,
      duplicates: acc.duplicates + s.duplicates,
      errors: acc.errors + s.errors,
      cost_usd: acc.cost_usd + s.cost_usd,
    }),
    { fetched: 0, classified: 0, inserted: 0, duplicates: 0, errors: 0, cost_usd: 0 },
  );
  console.log(`\nTotal: ${total.fetched} fetched, ${total.classified} classified, ${total.inserted} new, ${total.duplicates} dup, ${total.errors} err, $${fmt(total.cost_usd)}`);
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
