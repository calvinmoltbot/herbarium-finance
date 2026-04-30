-- Migration 014 — cron_runs table (issue #13 Session 3)
--
-- Records every cron job execution for observability. Phase A only writes
-- gmail-classifier rows here, but the schema is generic so future cron jobs
-- can share it (just pick a unique job_name).
--
-- Source of truth for "last run status" tile on /ai-usage. The classifier
-- script writes a row at the end of main() — success or caught failure.
-- An uncaught crash leaves no row; the UI tile flags "no run >36h" as stale.

BEGIN;

CREATE TABLE IF NOT EXISTS cron_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name        text NOT NULL,
  started_at      timestamptz NOT NULL,
  finished_at     timestamptz NOT NULL DEFAULT now(),
  success         boolean NOT NULL,
  summary         text,
  error_message   text,

  -- Gmail-classifier-specific aggregates (NULL for other jobs)
  classified      integer,
  inserted        integer,
  matched         integer,
  cost_usd        numeric(10, 6),

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cron_runs_job_finished_idx
  ON cron_runs (job_name, finished_at DESC);

ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

-- Shared visibility (consistent with project convention since mig 013).
-- Inserts come from service-role key which bypasses RLS, so no INSERT policy
-- is needed for the cron itself; the policy is here in case a human action
-- ever wants to record one (rare).
CREATE POLICY "Authenticated users can view all cron runs"
  ON cron_runs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert cron runs"
  ON cron_runs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- No UPDATE/DELETE — cron history is immutable audit data.

COMMIT;
