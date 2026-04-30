#!/usr/bin/env tsx
/**
 * Idempotent setup for the cron's "system" user.
 *
 * Creates an auth user (`system@herbarium.local`) with a throwaway random
 * password that nobody saves anywhere — its sole purpose is to be a valid
 * FK target for cron-written rows (email_classifications, llm_usage).
 *
 * The schema's `handle_new_user` trigger auto-seeds 8 default categories
 * for every new user. We don't want them under the system account, so the
 * script removes them immediately after creation.
 *
 * Usage: pnpm setup-system-user
 *
 * Prints the resulting user_id — paste it into
 * scripts/gmail-classifier/config.ts as the new TARGET_USER_ID.
 */

import { createClient } from '@supabase/supabase-js';

const SYSTEM_EMAIL = 'cron-system@herbariumdyeworks.example';
// Note: created via Supabase dashboard 2026-04-30 because the admin API
// returned a 500 from the auth server; the dashboard signup path works.
// The script remains useful as documentation of intent + idempotency check.

const PROD_SUPABASE_URL = 'https://fqpsamtoqyuiwxqmewkw.supabase.co';

async function main(): Promise<void> {
  const url = process.env.CRON_SUPABASE_URL ?? PROD_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 1. Check if the system user already exists. The admin listUsers endpoint
  //    is paged; for a small project a single page is plenty.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listErr) throw listErr;

  let systemUserId = list.users.find((u) => u.email === SYSTEM_EMAIL)?.id ?? null;

  if (systemUserId) {
    console.log(`✓ system user already exists: ${systemUserId}`);
  } else {
    const password = crypto.randomUUID() + '-' + crypto.randomUUID();
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: SYSTEM_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Herbarium System (cron)' },
    });
    if (createErr) throw createErr;
    systemUserId = created.user.id;
    console.log(`✓ created system user: ${systemUserId}`);
  }

  // 2. Drop any auto-seeded default categories under the system user. The
  //    handle_new_user trigger inserts ~8 of these on signup. We don't want
  //    them — the system user owns no human-curated data.
  const { count: existingCats } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', systemUserId);

  if ((existingCats ?? 0) > 0) {
    // Cascade-clean: dependents first, then the categories. Mirrors the
    // app's cascading delete handler.
    const { data: catRows, error: catErr } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', systemUserId);
    if (catErr) throw catErr;
    const ids = (catRows ?? []).map((r) => r.id);

    if (ids.length > 0) {
      await supabase.from('categorization_patterns').delete().in('category_id', ids);
      await supabase.from('category_hierarchy_assignments').delete().in('category_id', ids);
      await supabase.from('category_usage_stats').delete().in('category_id', ids);
      await supabase.from('imported_transactions_test').delete().in('suggested_category_id', ids);
      const { error: delErr } = await supabase.from('categories').delete().eq('user_id', systemUserId);
      if (delErr) throw delErr;
      console.log(`✓ removed ${ids.length} auto-seeded default categories from system user`);
    }
  } else {
    console.log('✓ no default categories to clean up');
  }

  console.log('\nNext step: paste this into scripts/gmail-classifier/config.ts as TARGET_USER_ID:');
  console.log(`  ${systemUserId}`);
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
