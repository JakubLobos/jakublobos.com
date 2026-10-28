# T-075: Shorter privacy policy

- **Wave:** 7 (content) · **Size:** S · **Depends on:** none
- **Owner request (2026-10-28):** The privacy policy feels overlong. Shorten it by removing duplication only; no fact changes.

## Change (EN and PL alike, `apps/web/src/i18n/messages/privacy.ts`)

- Lead reduced to one sentence.
- "Who else handles data" section removed. Its facts moved into the data table's "Where" column; the Chapter V transfer sentence moved into the data section intro.
- Data table merged to 7 rows: Gemini checks, technical request data plus IP rate limiting, and the two PostHog modes become one row each. Storage rows removed; GA4 stays as a "Visit statistics" processing.
- Cookies table gains a "Legal basis" column and is the single home of the storage entries.
- Every `[OWNER: …]` / `[WŁAŚCICIEL: …]` placeholder is kept on its merged row. Identical duplicates (Gemini retention, Railway region) collapse to one.
- Unused `h3` block type and renderer branch removed.

## Allowed files

`apps/web/src/i18n/messages/privacy.ts`, `apps/web/src/components/pages/PrivacyPage.astro`, `e2e/privacy-and-404.spec.ts`, `docs/security.md`, `docs/content/pl-copy-review.md`, this spec, `tasks/reports/T-075/`.

## Validation

`pnpm verify` green; `/privacy` and `/pl/privacy` have no overflow at 390 and 1440 px and no axe violations.
