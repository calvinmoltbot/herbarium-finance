// Supabase client + insert helpers for the gmail classifier.
// Uses the service-role key — bypasses RLS but we set user_id explicitly.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TARGET_USER_ID } from './config';
import type { ClassificationResult, UsageRecord } from './types';

let _client: SupabaseClient | null = null;

// Production Supabase URL. The cron always hits prod (where the real data
// lives) regardless of whether the dev server is in local or prod mode.
// Override with CRON_SUPABASE_URL only when targeting a different environment.
const PROD_SUPABASE_URL = 'https://fqpsamtoqyuiwxqmewkw.supabase.co';

export function getServiceClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.CRON_SUPABASE_URL ?? PROD_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set (cron jobs cannot use the anon key — RLS blocks inserts)');
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

/** Fetch the set of gmail_msg_ids already classified for the target user. */
export async function getKnownMessageIds(): Promise<Set<string>> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('email_classifications')
    .select('gmail_msg_id')
    .eq('user_id', TARGET_USER_ID);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.gmail_msg_id));
}

export interface ClassificationRow {
  gmail_msg_id: string;
  thread_id: string;
  received_at: string; // ISO
  sender: string | null;
  result: ClassificationResult | null;
  raw_excerpt: string;
  classification_error: string | null;
}

/**
 * Insert a classification row and the matching usage row in a single
 * round trip. Returns true if the classification was inserted (not a duplicate).
 */
export async function persistClassification(row: ClassificationRow, usage: UsageRecord): Promise<{ inserted: boolean; classification_id: string | null }> {
  const supabase = getServiceClient();

  // Resolve suggested_category name → id (case-insensitive, must belong to user)
  let suggested_category_id: string | null = null;
  if (row.result?.suggested_category) {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', TARGET_USER_ID)
      .ilike('name', row.result.suggested_category)
      .limit(1)
      .single();
    suggested_category_id = data?.id ?? null;
  }

  const insertPayload = {
    user_id: TARGET_USER_ID,
    gmail_msg_id: row.gmail_msg_id,
    thread_id: row.thread_id,
    received_at: row.received_at,
    sender: row.sender,
    vendor: row.result?.vendor ?? null,
    amount: row.result?.amount ?? null,
    email_date: row.result?.email_date ?? null,
    items: row.result?.items ?? null,
    suggested_category_id,
    confidence: row.result?.confidence ?? null,
    raw_excerpt: row.raw_excerpt.slice(0, 500),
    classification_error: row.classification_error,
  };

  const { data: inserted, error } = await supabase
    .from('email_classifications')
    .insert(insertPayload)
    .select('id')
    .single();

  // 23505 = unique_violation (already classified — idempotent skip)
  if (error && error.code !== '23505') throw error;
  const classification_id = inserted?.id ?? null;
  const wasInserted = !!classification_id;

  // Always log usage, even if the classification was a duplicate (we still
  // burned tokens classifying it). Link to the classification_id when known.
  await supabase.from('llm_usage').insert({
    user_id: TARGET_USER_ID,
    provider: 'openrouter',
    model: usage.model,
    purpose: 'email_classification',
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    cost_usd: usage.cost_usd,
    duration_ms: usage.duration_ms,
    success: usage.success,
    error_message: usage.error_message,
    ref_table: classification_id ? 'email_classifications' : null,
    ref_id: classification_id,
  });

  return { inserted: wasInserted, classification_id };
}
