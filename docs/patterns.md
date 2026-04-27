# Categorisation patterns — discipline notes

The pattern matcher (`lib/pattern-matcher.ts`) auto-categorises transactions by regex-matching descriptions against the `categorization_patterns` table. Patterns can be hand-written or learned from `learnFromCategorization`.

## Behaviours that aren't obvious from the schema

- **`normalizeText` strips punctuation** before matching. `Apple.com` becomes `applecom`, `www.dtcrafts.co.uk` becomes `wwwdtcraftscouk`. Patterns containing literal `.` characters that expect punctuation will silently never match.
- **`enforceWordBoundaries` auto-wraps single plain words.** A stored pattern `office` is matched as `\boffice\b`. Storing both `office` and `\boffice\b` is duplication, not a different rule.
- **The matcher returns ALL matching patterns in arbitrary order.** It does not pick the most specific or highest-confidence match. Caller code is responsible for resolution.

## Rules for new or learned patterns

1. **No verification-suffix words.** Transactions often carry a "Verified against manual entry: …" suffix. Patterns derived from this suffix (`against`, `manual`, `entry`, `verified`, `reference`) match nearly every verified row. The `STOPWORDS` set in `lib/pattern-matcher.ts` excludes them from learning — extend it when new suffix words appear.
2. **Word boundaries are implicit, but store them explicitly.** Single-word patterns should be stored as `\bword\b`. Future learned patterns already use this format; older unbounded twins were removed in migration 008.
3. **No literal punctuation in patterns.** It will not match the normalised string. Use word boundaries instead.
4. **Drawings/personal transfers should not be auto-categorised as expenditure.** Patterns like `\bcalvin\b` or `\brevolut\b` that catch person-to-person transfers will misroute drawings until Phase 6 (#2) introduces the proper "Non-business / Personal" routing.

## Known unresolved issues

- **Conflict resolution is unimplemented.** When two patterns target different categories (e.g. `\bplan\b` → Bank fees vs `plan\s+cashback` → Interest), the matcher returns both and the caller has no length- or specificity-based ordering. Tracked as a follow-up to #8 once the gmail spike (#9) lands.
- **Confidence floor is unenforced.** Patterns at 60–70 confidence apply silently. A "suggest only / auto-apply" flag is on the roadmap but deferred until #9 clarifies whether patterns remain primary.
