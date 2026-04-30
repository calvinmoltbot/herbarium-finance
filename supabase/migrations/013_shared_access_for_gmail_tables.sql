-- Migration 013 — relax RLS on email_classifications + llm_usage so any
-- authenticated user (Calvin or Debbie) can see and act on the data.
--
-- The rest of the schema already uses auth.role() = 'authenticated' policies;
-- migrations 011/012 mistakenly used the per-user auth.uid() = user_id shape,
-- which hid all classification + LLM-cost data from anyone other than the
-- TARGET_USER_ID the cron writes under (Debbie). This migration aligns those
-- two tables with the rest of the schema.
--
-- user_id columns stay on the rows for audit / provenance — only visibility
-- and write-permission gates change.

BEGIN;

-- ===== email_classifications =====
DROP POLICY IF EXISTS "users see own classifications"   ON email_classifications;
DROP POLICY IF EXISTS "users insert own classifications" ON email_classifications;
DROP POLICY IF EXISTS "users update own classifications" ON email_classifications;
DROP POLICY IF EXISTS "users delete own classifications" ON email_classifications;

CREATE POLICY "Authenticated users can view all email classifications"
  ON email_classifications FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT forces the row's user_id to the caller — keeps the audit trail
-- accurate when a human (not the cron / service role) inserts a row.
CREATE POLICY "Authenticated users can insert email classifications"
  ON email_classifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Authenticated users can update all email classifications"
  ON email_classifications FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete all email classifications"
  ON email_classifications FOR DELETE
  USING (auth.role() = 'authenticated');

-- ===== llm_usage =====
DROP POLICY IF EXISTS "users see own usage"   ON llm_usage;
DROP POLICY IF EXISTS "users insert own usage" ON llm_usage;

CREATE POLICY "Authenticated users can view all llm usage"
  ON llm_usage FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert llm usage"
  ON llm_usage FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- No UPDATE/DELETE policies on llm_usage — audit records stay immutable.

COMMIT;
