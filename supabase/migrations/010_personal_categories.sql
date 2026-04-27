-- Migration 010 — Personal spend / repayment categories (issue #2 / Phase 6)
--
-- Renames the prior "Non-Business / Personal" category (created 2026-04-27 as
-- the first concrete step of Phase 6) to "Personal Spend" to match the issue
-- spec, and adds the matching "Personal Repayment" injection-side category so
-- spend ↔ repayment can be paired by the dashboard widget.
--
-- Both are capital-typed; existing stats/Bank Position math already folds
-- capital movements correctly (drawings reduce, injections add).

BEGIN;

UPDATE categories
SET name = 'Personal Spend'
WHERE user_id = 'bf0ad2c4-9183-409b-97a0-9bf170422fa8'
  AND name = 'Non-Business / Personal'
  AND type = 'capital';

INSERT INTO categories (id, user_id, name, type, capital_movement_type, color, created_at)
VALUES (
  gen_random_uuid(),
  'bf0ad2c4-9183-409b-97a0-9bf170422fa8',
  'Personal Repayment',
  'capital',
  'injection',
  '#10b981',
  now()
);

COMMIT;
