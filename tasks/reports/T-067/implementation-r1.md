# T-067 implementation report, round 1

**Status:** DONE

## Changes

- `apps/web/src/i18n/messages/guestbook.ts`: `form.notice` EN and PL only.
  - EN old: `Your message is reviewed before it appears. Please don’t include personal details.`
  - EN new: `Your message is reviewed automatically by AI before it appears. Please don’t include personal details.`
  - PL old: `Wiadomość jest sprawdzana, zanim pojawi się na stronie. Nie podawaj danych osobowych.`
  - PL new: `Twój wpis jest automatycznie sprawdzany przez AI, zanim się pojawi. Nie podawaj danych osobowych.` (draft, flagged for owner review)
- `docs/content/pl-copy-review.md`: `form.notice` row updated.
- No test or e2e asserted the old text (searched `apps`).

## Claim check

`docs/guestbook-moderation.md` (I-1, section 6): approval needs rules, OpenAI moderation and an AI suitability verdict (gpt-5-nano or Gemini) to all pass. "Reviewed automatically by AI" is accurate.

## Visual check

Built site, `astro preview --port 4407` (stopped afterwards). `#guestbook-notice` measured, no horizontal overflow (scrollWidth equals clientWidth) in any case; the sentence reads naturally before the privacy link.

| Locale | Width | Height | Lines |
| ------ | ----- | ------ | ----- |
| EN     | 390   | 58.5   | 3     |
| PL     | 390   | 58.5   | 3     |
| EN     | 1440  | 39     | 2     |
| PL     | 1440  | 39     | 2     |

## Validation

`pnpm verify` (format:check, lint, typecheck, test, build, budgets): green. `pnpm test:e2e` not run, as instructed.
