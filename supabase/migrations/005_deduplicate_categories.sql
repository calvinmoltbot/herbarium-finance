-- 005_deduplicate_categories.sql
--
-- Problem: 8 pairs of exact duplicate categories exist (same name, type, user_id).
-- In each pair, one copy has a hierarchy assignment and the other does not ("orphan").
-- Only "Product Sales" has transactions (6) on its orphan copy.
--
-- This migration:
--   1. Reassigns transactions from orphan duplicates to their hierarchy-assigned counterparts
--   2. Deletes the orphan duplicate categories
--   3. Adds a unique constraint to prevent future duplicates

-- Step 1: Reassign transactions from orphan duplicates to hierarchy-assigned copies.
-- An "orphan" is a category that shares (name, type, user_id) with another category
-- but does NOT have a hierarchy assignment, while its counterpart DOES.
UPDATE public.transactions t
SET category_id = keeper.id
FROM public.categories orphan
JOIN public.categories keeper
  ON keeper.name = orphan.name
  AND keeper.type = orphan.type
  AND keeper.user_id = orphan.user_id
  AND keeper.id != orphan.id
WHERE t.category_id = orphan.id
  -- orphan has no hierarchy assignment
  AND NOT EXISTS (
    SELECT 1 FROM public.category_hierarchy_assignments cha
    WHERE cha.category_id = orphan.id
  )
  -- keeper has a hierarchy assignment
  AND EXISTS (
    SELECT 1 FROM public.category_hierarchy_assignments cha
    WHERE cha.category_id = keeper.id
  );

-- Step 2: Delete orphan duplicate categories.
-- These are categories that share (name, type, user_id) with another category,
-- have no hierarchy assignment, and whose counterpart DOES have one.
DELETE FROM public.categories orphan
WHERE NOT EXISTS (
    SELECT 1 FROM public.category_hierarchy_assignments cha
    WHERE cha.category_id = orphan.id
  )
  AND EXISTS (
    SELECT 1 FROM public.categories keeper
    JOIN public.category_hierarchy_assignments cha ON cha.category_id = keeper.id
    WHERE keeper.name = orphan.name
      AND keeper.type = orphan.type
      AND keeper.user_id = orphan.user_id
      AND keeper.id != orphan.id
  );

-- Step 3: Add unique constraint to prevent future duplicates.
ALTER TABLE public.categories
  ADD CONSTRAINT categories_name_type_user_unique UNIQUE (name, type, user_id);
