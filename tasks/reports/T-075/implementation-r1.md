# T-075: Implementation report, round 1

- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** Sonnet 5.5

## Summary

Privacy policy shortened by removing duplication only (EN and PL). Lead is one sentence, the "recipients" section is gone (facts moved into the data table), the data table has 7 rows (was 13), the cookies table gained a "Legal basis" column and is the only home of the storage entries, and the unused `h3` block type and renderer branch are removed.

## Validation output

- `pnpm verify`: green (format, lint, typecheck, test, build, budgets).
- Built page, port 4414: no horizontal overflow and 0 axe violations at 390 and 1440, EN and PL.
- Page height (px), before to after: EN 390 6954 to 5109; EN 1440 5535 to 4103; PL 390 8404 to 6370; PL 1440 6183 to 4674.
- Sections 6 to 5; tables 2 to 2; data rows 13 to 7; cookie rows 5 to 5.
- Placeholders in the rendered text, EN: 9 to 6; PL: 9 to 6. All 6 distinct ones remain (address, Railway region, backup retention, Gemini log period, mailbox period, GA4 retention). Dropped only exact duplicates (Gemini retention x3 became 1, Railway region x2 became 1). `// OWNER-PLACEHOLDER` comments: 12 before, 12 after.
- e2e: `privacy-and-404.spec.ts` updated (no h3 left, row count 13 to 8 incl. header, renamed GA4 and PostHog rows). Not run, as instructed.

## Assumptions

- "The free quota is used, so no fee is charged" was dropped; it is a cost note, not a data fact.
- `PRIVACY_LAST_UPDATED` unchanged (no substantive change of facts).
- No links to `#recipients` exist in `apps/web/src`, `e2e/` or `docs/`.
