# T-030: Implementation report, round 1

- **Branch:** `task/T-030-contact-ui` (round 1 work, `main` merged in; later fixups are in implementation-r2.md)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

The Contact section is built: `sections/Contact.astro` (auto-fit grid, `SectionHeading` 05, lead, details) with `ContactDetails` (`<dl>` plus the PHONE row's Turnstile-verified reveal, `<phone-reveal>`) and `ContactForm` (`<contact-form>`, three `FormField`s on `TypingField`, honeypot, D-09 notice). Validation, outcome mapping and `clientRequestId` handling are pure helpers in `lib/contact-form.ts` on top of the contracts rules; `lib/api/contact.ts` and `lib/api/phone.ts` wrap the shared client with guards. Copy (EN and PL) is in `i18n/messages/contact.ts`; the scripts import it directly, so no JSON copy plumbing is needed.

## Files changed

| File                                                                           | Change                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `apps/web/src/components/sections/Contact.astro`                               | modified: replaces the stub                                               |
| `apps/web/src/components/contact/{ContactDetails,ContactForm,FormField}.astro` | added                                                                     |
| `apps/web/src/scripts/contact-form.ts`, `scripts/phone-reveal.ts`              | added: `<contact-form>` and `<phone-reveal>` custom elements              |
| `apps/web/src/lib/contact-form.ts` (+ test)                                    | added: pure validation visibility, outcome mapping, request id, templates |
| `apps/web/src/lib/api/contact.ts` (+ test), `lib/api/phone.ts` (+ test)        | added                                                                     |
| `apps/web/src/i18n/messages/contact.ts`                                        | added                                                                     |
| `e2e/contact.smoke.spec.ts`                                                    | added                                                                     |
| `apps/web/src/styles/tokens.css`                                               | modified: `--contact-lead-max` (CR-2)                                     |
| `tasks/reports/T-030/**`                                                       | added: this report and screenshots                                        |

## Acceptance criteria

| #    | Criterion (short)      | Status | Evidence                                                                                                                                                                                                                                                                                                                 |
| ---- | ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | Visual parity          | PASS   | `screenshots/contact-{idle,errors,sending,sent,failure}-{390,768,1024,1440}.png` compared with the design's idle/errors/loading/success/mobile shots: same geometry (row pitch, field heights within 1px, button 210×52, status/Send another wrap). Differences below.                                                   |
| AC-2 | Validation + timing    | PASS   | Browser script (Playwright, scratchpad): non-empty blur shows error, empty blur does not, live clearing, first invalid focused, exact EN copy, `role="alert"`, `aria-describedby`, `aria-invalid`. Unit: `visibleErrors`, `firstInvalidField`, `fieldErrorMessage` in `contact-form.test.ts`.                            |
| AC-3 | Outcomes               | PASS   | `submitOutcome` tests (200, 422 mapped with no generic fallback, 422 with unknown fields only is a failure, 429, 5xx/network/unexpected). Browser: 429 text, 422 field errors with focus, network failure, `[fail]` against the real API.                                                                                |
| AC-4 | No double submit       | PASS   | Browser: Ctrl+Enter plus two extra submit attempts produced exactly 1 POST. "Send another" clears fields, counter `0/1000`, status, focuses Name.                                                                                                                                                                        |
| AC-5 | Echo via `textContent` | PASS   | `status.textContent = fillTemplate(...)`; no HTML sinks anywhere in the diff.                                                                                                                                                                                                                                            |
| AC-6 | No-JS                  | PASS   | Chosen: under `@media (scripting: none)` the form is replaced by "This form needs JavaScript. Please email me instead."; until the script upgrades the element the form is `inert`. Phone row shows "Use the contact form or email."; mailto stays. `screenshots/contact-nojs-1440.png`; browser check with JS disabled. |
| AC-7 | Manual end-to-end      | PASS   | `pnpm dev` (console mailer): valid submit reached the sent state (a real POST, 200); a message with `[fail]` shows the failure state. The server log shows the redacted mailer line (`subjectLength`, `textLength` only) for the valid submit and a `provider_error` warning for `[fail]`.                               |
| AC-8 | Phone reveal           | PASS\* | `grep` of `dist/` for `\+48[ 0-9]{3,}` finds nothing (the JS only contains the `tel:` prefix). Fake flow (empty site key): reveal shows `+48 000 000 000` as `tel:+48000000000`, focused, announced; 403 shows "Couldn't verify. Try again." and retry works; no `challenges.cloudflare.com` request. See \* below.      |

\* Real widget path: with the test site key `1x…BB` the script loads only after the click, the invisible widget runs and a token is posted. The API (`HUMAN_VERIFIER=turnstile` with the test secret) answered 403 (expected, per orchestrator: Cloudflare's test keys return a test hostname that our hostname allowlist rejects; for T-041 and the owner, no code change), so the revealed state with a real widget is unverified; the UI correctly shows the failed state. CSP was verified with the CR below applied locally and a static server over the built `dist/`: no CSP violations when clicking "Show number". Without the CR the built meta CSP blocks Turnstile.

axe-core 4.11 (wcag2a/aa, 21a/aa, 22aa, best-practice) on `#contact`: 0 violations in idle, errors, sending, sent, failure, phone verifying, phone failed, phone revealed (1440).

## Validation output

```
$ pnpm verify
format:check ok; lint ok; typecheck: apps/web 0 errors, 0 warnings
packages/contracts: 4 files, 153 tests passed
apps/server:       29 files, 340 tests passed
apps/web:          17 files, 255 tests passed (final, after the r2 test trims)
build: Complete! (6 pages), exit 0
```

## Tests added

- `e2e/contact.smoke.spec.ts`: three specs on the production topology, run in all three projects.

- `lib/contact-form.test.ts`: validation through contracts (trim, per-field codes), error visibility timing and server override, first-invalid order, message fallback, template fill, `submitOutcome` for every `ApiResult` kind, request id reuse and invalidation.
- `lib/api/contact.test.ts`: request path/body, sent guard, 422 fields.
- `lib/api/phone.test.ts`: `tel` pattern and display guard (incl. `javascript:` and oversize), route/body, malformed success and 403 never yield a number.

Markup and the custom elements were verified in the browser rather than unit-tested (owner's token-saving instruction).

## Screenshots

`tasks/reports/T-030/screenshots/` at 390 / 768 / 1024 / 1440 for idle, errors, sending, sent, failure, plus the no-JS state at 1440. Differences from the design: the privacy notice line (D-09), the failure state (D-13) and a keyboard focus ring on the focused field (from `TypingField`, base `:focus-visible`) are additions; the prototype screenshots were taken at a different scroll offset so absolute y values differ.

## Assumptions

- Phone route is `POST /api/contact/phone` (docs/api.md and the server's route), not `/api/phone` as in the dispatch message.
- All phone failures (403, 429, 503, network, script blocked, 60 s timeout) show the same "Couldn't verify. Try again." line, so no `lib/api/phone.ts` mapping of 403 was needed.
- The `clientRequestId` is kept after a network/5xx failure only if the normalized payload is unchanged (the mail provider rejects a reused idempotency key with a different body); definitive answers (sent, 422, 429) spend it.
- Failure copy is shared for 503/network/unexpected: "Couldn't send your message right now. Please try again, or email me directly." Server-only field codes (`too_long`, `invalid_characters`) got my own EN/PL lines; unmapped codes fall back to the field's general message.
- After sent and after a failure, focus moves to the submit button (it was disabled while sending, which dropped focus); a 422 focuses the first invalid field.
- Submit and fields are sent normalized (trimmed) with `locale` and the honeypot value.

## Deviations from spec or design

- `dt` rows use baseline alignment instead of the prototype's `padding-top: 3px` (no 3px token); visually equivalent.

## Change Requests (shared surfaces / dependencies)

- **CR-1 (`apps/web/astro.config.ts`, Turnstile CSP):** inside `security.csp`:

  ```diff
  +      scriptDirective: { resources: ["'self'", 'https://challenges.cloudflare.com'] },
         directives: [
  +        'frame-src https://challenges.cloudflare.com',
           "default-src 'self'",
  ```

  Verified on a local build: the meta CSP gains `frame-src https://challenges.cloudflare.com` and `script-src 'self' https://challenges.cloudflare.com <hashes>`; no violations while the widget runs. `apps/web/security-headers.ts` is unaffected (header CSP carries only non-fetch directives). Until applied, the real widget is blocked in production builds; `PUBLIC_TURNSTILE_SITE_KEY` empty keeps the fake flow.

- **CR-2 (`apps/web/src/styles/tokens.css`), accepted and applied:** `--contact-lead-max: 380px` in the layout group; the fallback is gone from `Contact.astro`.
- **CR-1** is applied on `main` and merged here: the built `dist/index.html` meta CSP has `script-src 'self' https://challenges.cloudflare.com …` and `frame-src https://challenges.cloudflare.com`.

## Open issues and follow-ups

- PL strings (all in `i18n/messages/contact.ts`) are drafts for owner review: eyebrow "KONTAKT", title "Zbudujmy coś razem", lead, detail labels (E-MAIL, TELEFON, GITHUB, LINKEDIN, JĘZYKI), phone copy, form labels/placeholders ("Jan Kowalski", "jan@firma.pl"), button and status texts, failure/rate-limit text, notice and privacy link, all field errors.
- Real Turnstile pass-through with Cloudflare test keys not confirmed end to end (see AC-8 note); worth checking with the production key and `TURNSTILE_ALLOWED_HOSTNAMES`.
- Manual checks ran on `pnpm dev` and a static server over `dist/`; `pnpm preview` was not used.
- E2E: `e2e/contact.smoke.spec.ts` (sent + send another, field error with focus, phone reveal with the fake verifier, axe on `#contact`) passed before the CR-1 merge: `pnpm test:e2e e2e/contact` gave 9 passed (chromium-desktop, chromium-mobile, webkit-desktop). It needs `PUBLIC_TURNSTILE_SITE_KEY` empty at build (the fake flow); a root `.env` copied from `.env.example` sets the test key and would route the reveal through the stubbed Turnstile script.
- The e2e re-run after merging CR-1 could not start: :3000 and :8787 were held again by processes that are not mine (PIDs 24996 and 17616), so I did not kill them. The CR-1 merge only touched `astro.config.ts` and `tasks/README.md`.
