# T-041: Implementation report, round 1

- **Branch:** `task/T-041-journeys`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Extended the existing e2e specs to cover every row of `testing.md` section 4. Added `i18n`, `nav`, `motion` and `nojs` specs, grew `guestbook` and `contact` (renamed from `*.smoke`), and tagged the consent spec `@consent`. Specs run on chromium-desktop, chromium-mobile and webkit-desktop; real-server submissions run on chromium-desktop only because the API's global caps (20/hour) are shared.

## Files changed

| File                                                                | Change                                                                                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/fixtures.ts`                                                   | modified: per-request random `X-Real-IP` for API calls, `fulfillJson`, `sendsForReal`, `uniqueWord`, `latestGuestbookBody` helpers |
| `playwright.config.ts`                                              | modified: e2e API env `CLIENT_IP_SOURCE=x-real-ip` (was `socket`), so per-client limits (3 writes / 10 min) do not couple tests    |
| `e2e/guestbook.spec.ts`                                             | renamed from `guestbook.smoke`; display states, stubbed modal on all projects, one real moderation journey with `expect.poll`      |
| `e2e/contact.spec.ts`                                               | renamed from `contact.smoke`; empty submit, mailer failure, phone reveal (HTML check, announce, failure and retry)                 |
| `e2e/i18n.spec.ts`, `nav.spec.ts`, `motion.spec.ts`, `nojs.spec.ts` | added                                                                                                                              |
| `e2e/consent.spec.ts`                                               | modified: `@consent` tag only                                                                                                      |

## Acceptance criteria

| #    | Criterion                                                 | Status | Evidence                                                                                                                                         |
| ---- | --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | All journeys; nav/guestbook/contact/consent on 3 projects | yes    | Full run: 151 passed, 38 skipped (project-specific skips), 0 failed. Real-server and desktop-only tests are skipped on other projects by design. |
| AC-2 | Deterministic, repeat-each=5                              | yes    | `--grep "@guestbook\|@contact" --repeat-each=5`: 230 passed, 10 skipped, 0 failed (3.6 min). No `waitForTimeout` anywhere.                       |
| AC-3 | Full suite under 4 min                                    | yes    | `pnpm test:e2e`: 2.9 min (2m53s wall, including the astro build). One earlier run: 3m01s.                                                        |

## Validation output

```
$ pnpm verify                      -> format, lint, typecheck, test, build all green
$ E2E_API_PORT=3100 E2E_SITE_PORT=8887 pnpm test:e2e
  38 skipped, 151 passed (2.9m)
$ ... pnpm test:e2e --grep "@guestbook|@contact" --repeat-each=5
  10 skipped, 230 passed (3.6m)
```

## Tests added

- `i18n`: head metadata per locale (lang, title, hreflang, OG image), `/pl/missing` Polish 404, Polish browser to `/pl` and switcher to EN sticks on reload.
- `nav`: desktop anchors set `aria-current`; mobile menu opens, focus lands on Close, Tab/Shift+Tab never leave the dialog, scroll lock, Escape restores focus, link click closes, axe with the menu open.
- `guestbook`: loading (delayed route), null, 500, abort plus "Try again", constant block height across states, validation, stubbed submit modal (tint, focus, axe), one real journey: `[flag]`, `[unsuitable]`, `[fail]`, then an XSS payload is the only published message, rendered as literal text, no dialog, no `window.__xss`.
- `contact`: empty submit (three errors, focus Name), mailer failure (real `[fail]` marker on desktop, stubbed 503 elsewhere), phone reveal (no number in HTML of `/` and `/pl`, tel link, focus, announcement, failure then retry).
- `motion`: reduced motion gives no marquee animation, no type-in mirror, `scroll-behavior: auto`; a no-preference control proves the probes can fail.
- `nojs`: sections visible, fallback texts, links and language switcher work.

## Assumptions

- Moderation rejection (`[flag]`, `[unsuitable]`) is not directly observable through the public API, and a newer submission supersedes older pending rows. The e2e proves the uniform modal and that only the newest message is ever published; the rejection semantics stay covered by the worker unit tests.
- Fake-verifier path is used for the phone reveal (the build has an empty Turnstile sitekey). The Turnstile test and always-fail keys need a differently built site; a rejected verification at the API (stubbed 403 once) covers the same visitor-facing path.
- Root cause of the known guestbook flake: the unique suffix was a letters-only encoding of a timestamp, which sometimes had 7+ consecutive consonants and was silently rejected by the keyboard-mash rule. `uniqueWord()` now builds pronounceable syllables.

## Deviations from spec or design

- `playwright.config.ts` env change (`CLIENT_IP_SOURCE`) goes slightly beyond "projects or tags only"; it is the only way to avoid the 3-per-10-minute per-client limit with a single test host. No product code touched.

## Change Requests

- None.

## Open issues and follow-ups

- Guestbook global cap (20/hour) is exactly used up by `--repeat-each=5` of the real journey (4 sends per run). Raising repeat counts needs a test-only cap override in the server.
- Full-suite runtime is close to the 4 minute budget when other agents load the host.
- PL text is matched only in language-agnostic ways (attributes and lang); no PL prose assertions were added, so NBSP changes from T-034 do not affect these specs.
