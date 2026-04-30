// Configuration for the gmail classifier.

export const GOG_ACCOUNT = 'herbariumdyeworks@gmail.com';
export const GOG_CLIENT = 'herbarium';

// Cron-written rows (email_classifications, llm_usage) are stamped with a
// dedicated "system" user_id so the audit trail honestly reflects automation
// rather than masquerading as Debbie. The user has no human login surface
// (random password generated on creation, never saved). RLS is shared since
// migration 013 — both Calvin and Debbie can see and act on these rows.
export const TARGET_USER_ID = 'e1e07ad5-e63d-4564-a312-73423a0863c6';

// Vendors we know to look for. Each entry is a Gmail query fragment matching
// the typical sender of purchase confirmations from that vendor. We expand this
// list as we discover new senders during real runs.
//
// Add a vendor: add the Gmail query and the human-readable name. Done.
// Gmail auto-applies a `category:purchases` label to order/receipt emails.
// We use that as the primary filter — much higher signal than per-vendor
// sender patterns, and Gemini extracts the actual vendor from the content.
// Note the negative filter: [Herbarium Dyeworks] Order #... emails are
// customers buying from Debbie's Shopify store, not Debbie's purchases.
export const VENDORS: Array<{ query: string; name: string }> = [
  { query: 'category:purchases -subject:"Herbarium Dyeworks"', name: 'Gmail Purchases' },
];

// How far back to look on each run. Phase A defaults to 7 days; cron runs
// nightly so the overlap is fine (idempotent insert via UNIQUE constraint).
export const LOOKBACK_DAYS = Number(process.env.GMAIL_LOOKBACK_DAYS ?? '7');

// Max emails to process per vendor per run — safety cap for early days.
export const MAX_PER_VENDOR = Number(process.env.GMAIL_MAX_PER_VENDOR ?? '20');

// LLM model — overridable via env so we can A/B without code changes.
// Default chosen 2026-04-28 after gemini-flash-001 hit sustained 504/429s while
// flash-lite handled the same workload with no retries needed and lower cost.
// Override via OPENROUTER_MODEL env var to A/B without code change.
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-lite-001';
