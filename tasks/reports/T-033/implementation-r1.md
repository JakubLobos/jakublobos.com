# T-033: Implementation report, round 1

- **Branch:** `task/T-033-privacy-404`, based on `main` @ `f988f87`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

> **OWNER AND LEGAL REVIEW REQUIRED.** The privacy policy is a draft. The Polish text is an agent draft for the D-02 language review. Nothing here is legal advice. Placeholders below must be filled before go-live.

## Summary

`PrivacyPage` renders a long-form policy (EN and PL) from a typed content module: `SectionHeading` h1, lead, "last updated" `<time>`, h2 sections, h3 per processor, definition list for the controller, and two token-styled tables (data table mirroring `security.md` §8 row by row, plus cookies). `NotFoundPage` is a centred hero-style page (reused `Mascot`, doodle h1, primary "home" and secondary "projects" `Button`s, all root-relative). Both pages use the existing chrome and tokens only.

## Files changed

| File                                                    | Change                                                                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/pages/PrivacyPage.astro`       | modified: stub replaced by the policy layout                                                                                  |
| `apps/web/src/components/pages/NotFoundPage.astro`      | modified: stub replaced by the 404 layout                                                                                     |
| `apps/web/src/i18n/messages/privacy.ts`                 | added: EN + PL policy content (typed blocks; plain `Record<Locale, …>` because `defineMessages` cannot hold arrays)           |
| `apps/web/src/i18n/messages/not-found.ts`               | added: EN + PL copy via `defineMessages`                                                                                      |
| `e2e/privacy-and-404.spec.ts`                           | added: e2e (outside the task's _Allowed files_ list; added because the orchestrator asked for e2e specs using T-040 fixtures) |
| `tasks/reports/T-033/` (report, `screenshots/*.png` x6) | added                                                                                                                         |

## Acceptance criteria

| #    | Criterion                                                                         | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---- | --------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Both locales; switcher `/privacy` <-> `/pl/privacy`; SEO titles; `noindex` on 404 | OK     | e2e "the language switcher swaps between /privacy and /pl/privacy" (also asserts both titles); "404 page: is noindex, accessible, and links home" (en, pl)                                                                                                                                                                                                                                                                                                                    |
| AC-2 | Policy matches `security.md` §8; placeholders listed                              | OK     | All 11 §8 rows are in the data table (e2e asserts 5 columns, 12 rows incl. header). Cross-check: guestbook row (SQLite on Railway, <= 100 rows, pending <= 24 h, delete on request), OpenAI moderation (none), OpenAI Responses (<= 30 days, no training), Contact (Resend, not stored by app), Turnstile (after click), IP (memory, <= 24 h), `lang` (1 yr), `jl-cookies`, GA4 (consent), PostHog consented, PostHog cookieless (legit. interest). Placeholders listed below |
| AC-3 | Unknown URLs show the localized 404 with a working link home                      | OK     | e2e on nested `/no/such/page` and `/pl/no/such/page`: status 404, link home lands on `/` / `/pl`. (The Express-served 404 is T-016's; this page is the static `404.html` that Cloudflare serves)                                                                                                                                                                                                                                                                              |
| AC-4 | Heading order, axe clean, readable line length                                    | OK     | e2e "one h1, headings in order, readable measure, no overflow" (en, pl, 3 browsers) runs axe, a single h1, no level jumps, paragraphs <= 680 px (`max-width: 70ch`), no horizontal page scroll; the wide table scrolls inside a focusable `role="region"`                                                                                                                                                                                                                     |

## Validation output

```
$ pnpm verify
Checking formatting... All matched files use Prettier code style!
lint: clean; apps/web typecheck: 0 errors, 0 warnings, 0 hints
packages/contracts Tests 153 passed · apps/server Tests 340 passed · apps/web Tests 230 passed
apps/web build: 6 page(s) built, Complete!
$ pnpm test:e2e e2e/privacy-and-404.spec.ts
2 skipped
19 passed (24.1s)     # chromium-desktop, chromium-mobile, webkit-desktop
```

The 2 skips are the header-switcher tests on `chromium-mobile` (on narrow screens the switcher lives in the menu dialog).

## Tests added

- `e2e/privacy-and-404.spec.ts`: privacy structure and axe (both locales), data table shape, switcher round trip, 404 noindex/axe/home link (both locales, nested URL), 404 switcher target. No unit tests: no logic was extracted.

## Screenshots

`tasks/reports/T-033/screenshots/{privacy,privacy-pl,404}-{1440,390}.png`. No design exists for these pages; they follow the existing section typography (eyebrow + doodle heading, body 15/1.7, hero-like 404).

## Open item from T-023 review: switcher on 404

No change needed, no CR. On `/404` the switcher targets `/set-language?lang=pl&to=/pl/404`; the Worker's allowlist fallback is exactly "the other locale's home" (`/pl`, `/`), which is the right target for a page with no translation. Now covered by e2e ("the switcher on a 404 leads to the other language's home page"), and noted in a comment in `NotFoundPage.astro`.

## Owner placeholders (visible on the page as `[OWNER: …]` / `[WŁAŚCICIEL: …]`, marked `OWNER-PLACEHOLDER` in `privacy.ts`)

1. Controller postal address or business registration.
2. Railway region (in the data table and the Railway section; `security.md` recommends EU).
3. How long the mailbox keeps contact messages.
4. GA4 retention period (expected to be set to the minimum per the go-live checklist; confirm).

Also confirm: the contact email shown is `profile.email` (the public site email); "last updated" is 2026-10-26 (`PRIVACY_LAST_UPDATED`) and must be bumped on edits.

## Assumptions

- Transfers outside the EEA are described generically ("safeguards the provider offers under Chapter V of the GDPR"); the exact mechanism (SCCs / DPF) is not stated because it is unverified. Legal review should confirm.
- The "automated decision" sentence (guestbook publication, no legal effect, contact me) is my wording, not from the docs.
- The guestbook notice says personal data is rejected (the form rejects emails and 9+ digits only).
- The PostHog cookieless row is stated as legitimate interest per ADR-0011; flagged in a source comment for legal review (not on the public page).
- 404 page has a secondary "See my projects" button (`/#projects`) besides the home button.

## Deviations from spec or design

- None. `PrivacyPage` uses a typed content record instead of `defineMessages` because that helper's `MessageTree` type does not allow arrays (parity is still enforced by the `Record<Locale, PrivacyCopy>` type, but array lengths are not checked between EN and PL).

## Change Requests

- None.

## Open issues and follow-ups

- PL text needs the D-02 owner review; the whole policy needs legal review (placeholders above).
- The footer/banner/form-notice links to the policy belong to other tasks.
- Verified in the build output: the sitemap lists only `/`, `/pl`, `/privacy`, `/pl/privacy` (no 404 pages).
- Only the first e2e run hit port contention with another agent; I waited for the ports to free and killed no process.
