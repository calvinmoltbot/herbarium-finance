-- Migration 012 — llm_usage table (issue #13, Phase A)
--
-- Tracks every OpenRouter (or other LLM) call so we can monitor cost per
-- model and switch up empirically. One row per call, success or failure.
-- Captures provider-reported cost rather than computing from token rates.

BEGIN;

CREATE TABLE IF NOT EXISTS llm_usage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),

  -- What we called
  provider            text NOT NULL DEFAULT 'openrouter',
  model               text NOT NULL,
  purpose             text NOT NULL,

  -- What it cost
  prompt_tokens       integer,
  completion_tokens   integer,
  total_tokens        integer,
  cost_usd            numeric(10, 6),

  -- Diagnostics
  duration_ms         integer,
  success             boolean NOT NULL,
  error_message       text,

  -- Optional link to the thing this call produced
  ref_table           text,
  ref_id              uuid,

  CONSTRAINT llm_usage_cost_nonneg CHECK (cost_usd IS NULL OR cost_usd >= 0),
  CONSTRAINT llm_usage_tokens_nonneg CHECK (
    (prompt_tokens IS NULL OR prompt_tokens >= 0) AND
    (completion_tokens IS NULL OR completion_tokens >= 0) AND
    (total_tokens IS NULL OR total_tokens >= 0)
  ),
  CONSTRAINT llm_usage_duration_nonneg CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

CREATE INDEX IF NOT EXISTS llm_usage_user_created_idx ON llm_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS llm_usage_model_created_idx ON llm_usage (model, created_at DESC);
CREATE INDEX IF NOT EXISTS llm_usage_purpose_created_idx ON llm_usage (purpose, created_at DESC);

ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own usage" ON llm_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users insert own usage" ON llm_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No update/delete policies — usage records are immutable audit data.

COMMIT;
