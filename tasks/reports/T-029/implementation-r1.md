# T-029: Implementation report, round 1

- **Branch:** `task/T-029-guestbook-ui` (based on `main` @ `ff461ea`)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

The Guestbook section (`04`) is built: the last-visitor quote with its four states, the paint picker (native radios), the form on top of `TypingField`, and the native "In review" `<dialog>`. Logic lives in pure `lib/` modules (submit controller with idempotent `clientRequestId` and a double-submit guard, validation through `checkGuestbookBody`, response mapping, API wrappers); the two custom elements (`<last-visitor>`, `<guestbook-form>`) only touch the DOM. Untrusted text is written with `textContent` only. Copy is in `i18n/messages/guestbook.ts` (EN + PL draft).

## Files changed

| File                                                       | Change                                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/web/src/components/sections/Guestbook.astro`         | modified: replaces the stub (heading, quote, form, modal)                                      |
| `apps/web/src/components/guestbook/LastVisitorQuote.astro` | added: four stacked states, reserved height, noscript empty state                              |
| `apps/web/src/components/guestbook/PaintPicker.astro`      | added: `fieldset` + hidden radios, 40px hit area, 24px swatch, ring                            |
| `apps/web/src/components/guestbook/GuestbookForm.astro`    | added: TypingField row, counter, honeypot, picker, Button, error line, privacy notice          |
| `apps/web/src/components/guestbook/GuestbookModal.astro`   | added: native modal dialog                                                                     |
| `apps/web/src/scripts/last-visitor.ts`                     | added: `<last-visitor>` (IntersectionObserver 600px, fetch, state switching)                   |
| `apps/web/src/scripts/guestbook-form.ts`                   | added: `<guestbook-form>` (counter, submit flow, busy, errors, modal)                          |
| `apps/web/src/lib/api/guestbook.ts` (+ test)               | added: guards, `getLatestGuestbookMessage` (8 s), `submitGuestbookMessage`                     |
| `apps/web/src/lib/guestbook-form.ts` (+ test)              | added: `checkSubmission`, `createSubmitController`, `parseFormMessages`, `remainingToAnnounce` |
| `apps/web/src/lib/guestbook-latest.ts` (+ test)            | added: `ApiResult` to display state                                                            |
| `apps/web/src/lib/guestbook-paint.ts` (+ test)             | added: `isPaintId`, `tintValue`                                                                |
| `apps/web/src/i18n/messages/guestbook.ts`                  | added: all copy, EN + PL                                                                       |

## Acceptance criteria

| #    | Criterion (short)     | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | --------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | Visual parity         | PASS   | `screenshots/idle-*.png`, `typing-*`, `modal-*`; measured against the design: label-to-input distance 177 px at 1440 (design 177), modal geometry and tint band match. Differences below.                                                                                                                                                                                                                          |
| AC-2 | `textContent` only    | PASS   | Playwright run: latest message `<img src=x onerror=alert(1)>` shows literally (0 `img` elements); modal echo of `x<b>bold</b>` shows literally (0 `b`); 0 dialogs/alerts fired.                                                                                                                                                                                                                                    |
| AC-3 | Paint picker keyboard | PASS   | Playwright run: ArrowRight moves yellow to purple; Tab leaves the group to the submit button (one stop). Names come from the label text (axe clean).                                                                                                                                                                                                                                                               |
| AC-4 | API outcomes          | PASS   | Unit tests in `guestbook-form.test.ts` (202, 422 to first body code, 429, 503/network/unexpected, double submit once, request-id reuse and renewal); UI renders each (`field-error-*`, `rate-limited-*`, `busy-*`, `modal-*` screenshots). Playwright: `dblclick` produced 1 POST.                                                                                                                                 |
| AC-5 | Modal                 | PASS   | Playwright run: focus lands on "Got it"; Escape closes and focus returns to `#guestbook-body`; backdrop click closes; page is inert (native `showModal`). No animations are defined at all.                                                                                                                                                                                                                        |
| AC-6 | No layout shift       | PASS   | All four states share one grid cell inside a `min-height: 120px` block; the error state is a single line, so the block is the same height as a one-line quote (verified by the 177 px label-to-input distance in idle and error). Longer quotes (2 to 3 lines) do grow the block, as in the design; the fetch starts 600 px before the section is visible, so this normally happens off screen. No Lighthouse run. |
| AC-7 | Manual end-to-end     | PASS   | Real API (fake providers) on :3100: submit with Violet, modal echoed text, input cleared, reload after 1 s showed the new quote with `--tint: var(--paint-violet-tint)`. Note: the per-client rate limit then correctly answered 429 on later runs.                                                                                                                                                                |

Additional: axe-core on `#guestbook` in 20 states (idle 390/768/1024/1440; loading, empty, error, typing, field-error, rate-limited, busy, modal at 1440 and 390): **0 violations**. No-JS run (`javaScriptEnabled: false`): controls are disabled, the loading panel is hidden and the empty text is shown (`nojs` check via screenshot). PL page renders "Zostaw ślad".

## Validation output

```
$ pnpm verify
packages/contracts test:  Tests  153 passed (153)
apps/server test:         Tests  340 passed (340)
apps/web test:            Test Files 20 passed (20) / Tests 261 passed (261)  (after merging main)
apps/web typecheck/build: astro check 0 errors, 0 warnings; build complete
$ pnpm lint        (eslint, astro/no-unused-css-selector included): clean
$ pnpm test:e2e e2e/guestbook
7 passed, 2 skipped (the real-submit test runs on chromium-desktop only)
```

Manual runs used a build with `PUBLIC_API_BASE_URL=http://localhost:3100` and the Node edge emulator on :8787, because :3000/:4321 were occupied by another agent's `pnpm dev`. All my processes (edge emulator and API) were stopped afterwards; ports 3000/3100/4321/8787 were confirmed free on my side.

## Tests added

- `lib/guestbook-form.test.ts`: validation (valid, trimmed-empty, link, contact info, too long, stripped-character case), controller (one request per double click, no request or busy state for empty/invalid, 422 / 429 / transport mapping, request-id reuse on retry, renewal on text or paint change and after success), `parseFormMessages`, `remainingToAnnounce` (silent below 100, 100/110/120, paste, delete).
- `lib/api/guestbook.test.ts`: both guards, URL/method/body of both calls, guard failure, the 8 s per-call timeout requested from the client, 422 field codes.
- `lib/guestbook-latest.test.ts`: message, empty and every failure kind.
- `lib/guestbook-paint.test.ts`: paint ID guard and tint variable.

## Screenshots

`tasks/reports/T-029/screenshots/`: `idle` at 390/768/1024/1440; `loading`, `empty`, `error`, `typing`, `field-error`, `rate-limited`, `busy`, `modal` at 1440 and 390 (20 files). In these captures the section heading is scrolled under the fixed header, so the eyebrow overlaps the nav; that is the capture position, not a layout issue.

Differences from the design screenshots:

- Button on mobile and the quote typography match; "Got it" uses the design's 28 px horizontal padding via a scoped override of the shared `Button`.
- Added (no design): inline error line under the input row, a privacy notice line (D-09) under the actions, the "Sending…" busy label.
- The counter uses `--color-text-muted` instead of the design's `--faint` (2.2:1 contrast; design-system §2 lists "counters" under muted).

## Assumptions (low-impact decisions taken)

- **No-JS form (NFR-13):** a form cannot post JSON, so without scripting the controls ship `disabled` (in a `fieldset`) and a `<noscript>` line says that leaving a mark needs JavaScript. `<guestbook-form>` enables them once running. Layout is unchanged either way.
- **Error copy:** 429 and "couldn't send" use `api.md` §5 wording (guestbook module) for all of 503, network, timeout and unexpected, so `errors.ts` is not used here.
- **Request id:** regenerated when the normalized text **or the paint** changes (the server drops a repeated id, so a changed paint would otherwise be lost), and after a success.
- The submitted body is the normalized text; the modal echoes that.
- Busy: the button width is pinned with `style.setProperty('min-width')` so "Sending…" doesn't resize it; the field becomes `readOnly` (not disabled) so focus stays.
- Announcements: polite live region speaks "N characters left" when typing crosses 100, 110 and 120 only.
- The `latest` 8 s timeout uses the new per-call `timeoutMs` of `client.ts` (CR-2).
- The retry button moves focus to the stage while the block reloads (the button is hidden meanwhile).
- Backdrop close requires the press to start on the backdrop, so selecting text in the card and releasing outside doesn't close it.

## Deviations from spec or design

- Spec text says the form "must work without JS"; implemented as degrade-without-breaking per NFR-13 (see Assumptions).
- Spec says the `aria-live="off"` counter plus an announcement at 100+; the announcement fires at thresholds (100/110/120) rather than on every keystroke.

## Change Requests (shared surfaces / dependencies)

- **CR-1 (accepted, done):** geometry tokens added to `styles/tokens.css`: `--guestbook-visitor-min-h`, `--guestbook-visitor-max-w`, `--guestbook-form-max-w`, `--swatch-hit`, `--swatch-size`, `--guestbook-modal-max-w`, `--guestbook-modal-copy-max-w`; the local blocks are removed.
- **CR-2 (accepted, done):** `lib/api/client.ts` takes an optional `timeoutMs` (via `AbortSignal.timeout`, reported as `network`). `client.test.ts` covers the default and a per-call timeout; the old fake-timer test was replaced because fake timers don't control `AbortSignal.timeout`.

## Open issues and follow-ups

- `e2e/guestbook.smoke.spec.ts` added (T-040 merged): axe on the section, a localized field error with no request sent, and a real submit (chromium-desktop only, because the API allows 3 submissions per 10 minutes) covering the modal, focus, cleared input and the approved quote with its violet tint. Ports 3000/8787 were free before and after. The earlier Playwright checks (AC-2, AC-3, no-JS) were ad-hoc scripts outside the repo.
- Lighthouse / Performance panel run for AC-6 was not done; AC-6 rests on the measured layout equality described above.
- PL strings are drafts for owner review (all of `i18n/messages/guestbook.ts` `pl`): title "Uwielbiam łączyć ludzi siłą frontendu", "OSTATNI GOŚĆ NAPISAŁ", "Zostaw ślad", "Wysyłanie…", paint names (Czerwony, Koralowy, Żółty, Purpurowy, Fioletowy, Niebieski), field errors, 429/retry texts, modal ("W TRAKCIE SPRAWDZANIA", "Dzięki za ślad!", "Rozumiem"), notice and "Prywatność".
- The shared `.hl` Highlight is the only place the tint is read; `--tint` is set on its wrapping span at runtime, as its comment prescribes.
