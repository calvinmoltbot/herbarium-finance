-- Migration: Fix capital_movement_type values and category name typo
--
-- Problem:
--   1. capital_movement_type was NULL on both capital categories
--   2. "Directors Withdrawl" had a typo and didn't match the hierarchy name
--
-- Changes:
--   - Set capital_movement_type = 'injection' on "Capital Injection"
--   - Set capital_movement_type = 'drawing' on "Directors Withdrawl"
--   - Rename "Directors Withdrawl" to "Directors Drawings"

-- 1. Set capital_movement_type on both capital categories
UPDATE public.categories
SET capital_movement_type = 'injection'
WHERE name = 'Capital Injection' AND type = 'capital';

UPDATE public.categories
SET capital_movement_type = 'drawing'
WHERE name = 'Directors Withdrawl' AND type = 'capital';

-- 2. Fix the typo: "Directors Withdrawl" -> "Directors Drawings"
UPDATE public.categories
SET name = 'Directors Drawings'
WHERE name = 'Directors Withdrawl' AND type = 'capital';

-- 3. Verify the changes
SELECT id, name, type, capital_movement_type
FROM public.categories
WHERE type = 'capital';
