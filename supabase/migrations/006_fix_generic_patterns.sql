-- Migration: Fix overly generic patterns that cause false positives
-- Problem: Single-word patterns like "post" match "postage", "repost", "posted"
-- Solution: Add word boundaries to short patterns, remove stopword-only patterns

-- 1. Delete patterns that are common stopwords and cause false positives
DELETE FROM categorization_patterns
WHERE pattern IN (
  'main', 'plus', 'good', 'user', 'transfer', 'verified', 'payment',
  'from', 'with', 'your', 'have', 'been', 'this', 'that', 'will',
  'more', 'some', 'than', 'them', 'very', 'when', 'what', 'make',
  'like', 'time', 'just', 'know', 'take', 'come', 'could', 'over',
  'such', 'after', 'also', 'back', 'into', 'year', 'only', 'other',
  'then', 'first', 'last', 'long', 'great', 'little', 'right', 'still',
  'find', 'here', 'thing', 'many', 'well', 'reference', 'completed'
);

-- 2. Add word boundaries to known problematic short single-word patterns
-- These are legitimate patterns but too short to match without boundaries
UPDATE categorization_patterns SET pattern = '\bpost\b'  WHERE pattern = 'post';
UPDATE categorization_patterns SET pattern = '\bplan\b'  WHERE pattern = 'plan';
UPDATE categorization_patterns SET pattern = '\bwool\b'  WHERE pattern = 'wool';
