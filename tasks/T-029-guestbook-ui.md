# T-029: Guestbook section UI and client integration

|                          |                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| **Wave**                 | 5                                                                                                 |
| **Depends on**           | T-010, T-021, T-022, T-028 (T-014 for manual end-to-end checks; unit work uses a stubbed `fetch`) |
| **Blocked by decisions** | none (D-12, D-13, D-09 answered; D-20 decided)                                                    |
| **Parallel with**        | T-030, T-032, T-033, T-017                                                                        |
| **Size**                 | L                                                                                                 |
| **Requirements**         | FR-25, FR-26, FR-27, NFR-01, NFR-02, NFR-05                                                       |

## Objective

Build the "I love connecting people through the power of frontend" section. It shows the latest approved message with its paint tint and lets visitors leave a mark through a form with the paint picker, the "IN REVIEW" modal, and robust error handling. All of it is wired to the guestbook API.

## References

- `docs/design-analysis.md` §4.11, §6 DF-5, DF-6
- `docs/guestbook-moderation.md` §10 (frontend behaviour; normative)
- `docs/api.md` §3 (`GET /latest`, `POST /api/guestbook`), §5 (client mapping)
- `docs/architecture.md` §4.3, §4.4
- `docs/security.md` §3 (XSS rules)
- `docs/design/extracted/design-source.html` L213–239, L380–398, L497–507, L598, L630–634
- Screenshots: `desktop-1440-guestbook.png`, `desktop-1440-guestbook-typing.png`, `desktop-1440-guestbook-modal.png`, `mobile-390-guestbook.png`

## Scope

- `sections/Guestbook.astro`: `SectionHeading` (04, centred, title max 640, balanced), `LastVisitorQuote`, `GuestbookForm`, `GuestbookModal`.
- `guestbook/LastVisitorQuote.astro` + `scripts/last-visitor.ts` (`<last-visitor>`): implements the **four display states** exactly as in `guestbook-moderation.md` §10 — **loading** (static HTML default: placeholder marker band, `aria-busy`, visually hidden loading text, pulse only with motion allowed), **message** (`textContent` + `--tint`), **empty** ("No marks yet. Be the first to leave one!"), **error** (muted line + "Try again" text button that refetches) — all at the same reserved min-height, plus a `<noscript>` empty-state. Fetches `GET {PUBLIC_API_BASE_URL}/api/guestbook/latest` (8 s timeout) when the section is within 600 px of the viewport. State is reflected via `data-state` for CSS; transitions between states use opacity only (no layout shift).
- `guestbook/PaintPicker.astro`: a native radio group (`fieldset` + visually hidden `legend` "Pick your paint"). Each option is a visually hidden `<input type="radio">` with a 40 × 40 label hit area and a 24 px swatch; checked ring `--ring-swatch`; focus-visible ring; default Yellow.
- `guestbook/GuestbookForm.astro` + `scripts/guestbook-form.ts` (`<guestbook-form>`):
  - `TypingField` (maxlength 120, `aria-label` localized)
  - live counter `n/120` (`aria-live="off"`; the counter is visual, and a polite announcement fires at 100+ characters only)
  - hidden honeypot field `website` (visually hidden, `tabindex="-1"`, `autocomplete="off"`, label "Leave empty")
  - submit `Button` (Leave a mark)
  - inline error line (`role="alert"`)
  - privacy notice line (D-09)
- Submit flow exactly per `guestbook-moderation.md` §10:
  - client validation with contracts `normalizeGuestbookBody`/`validateGuestbookBody` → localized field errors; trimmed-empty input → focus only
  - `clientRequestId` via `crypto.randomUUID()`, regenerated after a success or when the text changes
  - a busy state (D-13) prevents double submit
- `lib/api/guestbook.ts`: `getLatestGuestbookMessage()`, `submitGuestbookMessage()` using `lib/api/client.ts` with hand-written type guards.
- `guestbook/GuestbookModal.astro`: a native `<dialog>` per §4.11 (mini drips, IN REVIEW, title, echoed text via `textContent` with the tint, body copy, "Got it"). Closes on button, Escape, or backdrop click. Focus goes to "Got it" on open and returns to the input on close. Clear the input via `TypingField.reset()` after success.
- `messages/guestbook.ts`: all copy, including paint names, field-code errors, the loading/empty/error texts and "Try again", 429/503/network texts (generic ones from `errors.ts`). EN plus PL (agents write PL; the owner reviews at the end, D-02).

## Out of scope

Server behaviour (T-014). E2E journeys (T-041), though a smoke spec is welcome if T-040 has merged.

## Allowed files

`apps/web/src/components/sections/Guestbook.astro`, `apps/web/src/components/guestbook/**`, `apps/web/src/scripts/{guestbook-form,last-visitor}.ts`, `apps/web/src/lib/api/guestbook.ts` (+ test), `apps/web/src/lib/guestbook-*.ts` (pure helpers + tests), `apps/web/src/i18n/messages/guestbook.ts`, `e2e/guestbook.smoke.spec.ts` (only if T-040 is merged).

## Acceptance criteria

- **AC-1** Visual parity with the 4 referenced screenshots (idle, typing, modal, mobile), including quote typography, tint band from 55 % to 92 %, underline input, counter, swatches, and button.
- **AC-2** Untrusted text is only ever set with `textContent`. A message `<img src=x onerror=alert(1)>` renders literally in the quote and the modal.
- **AC-3** Paint picker: arrow keys move the selection, Tab enters and leaves the group as one stop, and the selected state is announced.
- **AC-4** Each API outcome produces the documented UI (unit tests on the controller logic with a stubbed client): 202 → modal + cleared input; 422 → localized field error with text kept; 429 → rate-limit text; 503, network, or timeout → retry text; double-click submits once.
- **AC-5** Modal: focus is managed, Escape closes, the background is inert, and the backdrop click closes. Under reduced motion there are no animations.
- **AC-6** No layout shift when the latest message loads (reserved height; verify with a Lighthouse or Performance panel note).
- **AC-7** Manual end-to-end with `pnpm dev` (fake moderation): submit → modal → reload a moment later → the new quote shows with the chosen tint.

## Validation

```
pnpm verify
pnpm dev     # manual AC-7
```

## Definition of done

Standard DoD plus screenshots of all states (idle, typing, error, busy, modal) at 1440 and 390, and the PL strings list.
