-- Migration 009 — Enforce transactions.type = categories.type (issue #7)
--
-- Closes the integrity hole that allowed expenditure-typed transactions
-- to be filed under income-typed categories (e.g. "To Deborah Helena Orr"
-- £79.98 marked expenditure under Transfers In/income).
--
-- Approach: triggers, not composite FK. The existing
-- transactions_category_id_fkey has ON DELETE SET NULL; adding a composite
-- FK alongside it produces undefined cascade ordering, so triggers are
-- safer and easier to reason about.
--
-- Pre-req: zero mismatches in current data (verified 2026-04-27 after
-- the manual cleanup pass; t.type = c.type for all rows).
--
-- Reversible: DROP TRIGGER + DROP FUNCTION undoes everything.

BEGIN;

-- =====================================================================
-- Trigger 1: on transactions — block INSERT/UPDATE that would violate
-- =====================================================================
CREATE OR REPLACE FUNCTION enforce_transaction_type_matches_category()
RETURNS trigger AS $$
DECLARE
  cat_type text;
BEGIN
  -- Uncategorised transactions are allowed; the type column stands alone.
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT type INTO cat_type FROM categories WHERE id = NEW.category_id;

  -- If the category doesn't exist, the existing FK will reject this row.
  -- Don't double-error here.
  IF cat_type IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.type <> cat_type THEN
    RAISE EXCEPTION
      'transactions.type (%) does not match categories.type (%) for category_id=%',
      NEW.type, cat_type, NEW.category_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_type_consistency ON transactions;
CREATE TRIGGER transactions_type_consistency
BEFORE INSERT OR UPDATE OF category_id, type ON transactions
FOR EACH ROW
EXECUTE FUNCTION enforce_transaction_type_matches_category();

-- =====================================================================
-- Trigger 2: on categories — block UPDATE of type while transactions ref
-- (Otherwise a category type-flip would silently violate the invariant
--  for every transaction that already references it.)
-- =====================================================================
CREATE OR REPLACE FUNCTION prevent_category_type_change_when_in_use()
RETURNS trigger AS $$
BEGIN
  IF NEW.type IS DISTINCT FROM OLD.type THEN
    IF EXISTS (SELECT 1 FROM transactions WHERE category_id = NEW.id LIMIT 1) THEN
      RAISE EXCEPTION
        'cannot change categories.type from % to % while transactions reference category id=%',
        OLD.type, NEW.type, NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categories_type_lock ON categories;
CREATE TRIGGER categories_type_lock
BEFORE UPDATE OF type ON categories
FOR EACH ROW
EXECUTE FUNCTION prevent_category_type_change_when_in_use();

COMMIT;
