# T-067: Guestbook notice, say the review is automatic

- **Wave:** 7 (copy) · **Size:** XS · **Owner request (2026-10-27):** the guestbook form notice should say, proudly, that messages are reviewed **automatically** (OpenAI moderation plus an AI suitability check, live status in seconds; see `docs/guestbook-moderation.md`).

## Copy

- EN: `Your message is reviewed automatically by AI before it appears. Please don’t include personal details.`
- PL: `Twój wpis jest automatycznie sprawdzany przez AI, zanim się pojawi. Nie podawaj danych osobowych.`

Before changing, confirm in `docs/guestbook-moderation.md` that "by AI" is accurate; otherwise report instead of shipping a false claim. Change only these two strings, update the matching rows in `docs/content/pl-copy-review.md` and any test asserting the old text. The notice is followed by a privacy link in `GuestbookForm.astro`; the sentence must still read well. Visual check at 390 px and 1440 px in both locales.

## Allowed files

`apps/web/src/i18n/messages/guestbook.ts` (notice strings only), `docs/content/pl-copy-review.md` (those rows), tests asserting the old text, `tasks/T-067-guestbook-notice.md`, `tasks/reports/T-067/**`.
