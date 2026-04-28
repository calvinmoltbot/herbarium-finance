-- Migration 011 — email_classifications table (issue #13, Phase A)
--
-- Stores LLM-extracted metadata from Debbie's gmail (gmail.readonly via gog).
-- One row per email we've classified. Phase A only inserts; Phase B will set
-- applied=true after a confident match.
--
-- Privacy: no full email body retained. raw_excerpt is a max-500-char snippet
-- for human verification in the triage UI.

BEGIN;

CREATE TABLE IF NOT EXISTS email_classifications (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identity in Gmail
  gmail_msg_id            text NOT NULL,
  thread_id               text NOT NULL,
  received_at             timestamptz NOT NULL,
  sender                  text,

  -- LLM extraction
  vendor                  text,
  amount                  numeric(10,2),
  email_date              date,
  items                   jsonb,
  suggested_category_id   uuid REFERENCES categories(id) ON DELETE SET NULL,
  confidence              numeric(3,2),    -- 0.00–1.00

  -- Matching (filled by the matching pass in Phase A)
  matched_transaction_id  uuid REFERENCES transactions(id) ON DELETE SET NULL,
  match_score             numeric(3,2),

  -- Lifecycle
  applied                 boolean NOT NULL DEFAULT false,   -- Phase B will set this true
  reviewed_by_user        boolean NOT NULL DEFAULT false,   -- toggled when user clicks apply/dismiss
  raw_excerpt             text,                              -- ≤500 chars for verification

  -- Errors / diagnostics
  classification_error    text,                              -- non-null if LLM call failed

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_classifications_excerpt_length CHECK (raw_excerpt IS NULL OR length(raw_excerpt) <= 500),
  CONSTRAINT email_classifications_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT email_classifications_match_score_range CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 1)),

  -- Idempotency: a given gmail message is classified at most once per user
  UNIQUE (user_id, gmail_msg_id)
);

CREATE INDEX IF NOT EXISTS email_classifications_user_received_idx
  ON email_classifications (user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS email_classifications_matched_tx_idx
  ON email_classifications (matched_transaction_id) WHERE matched_transaction_id IS NOT NULL;

-- Standard RLS pattern from elsewhere in the project
ALTER TABLE email_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own classifications" ON email_classifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users insert own classifications" ON email_classifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own classifications" ON email_classifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users delete own classifications" ON email_classifications
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-bump updated_at
CREATE OR REPLACE FUNCTION email_classifications_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_classifications_updated_at
BEFORE UPDATE ON email_classifications
FOR EACH ROW
EXECUTE FUNCTION email_classifications_set_updated_at();

COMMIT;
