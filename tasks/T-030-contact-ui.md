# T-030: Contact section UI and client integration

|                          |                                                                               |
| ------------------------ | ----------------------------------------------------------------------------- |
| **Wave**                 | 5                                                                             |
| **Depends on**           | T-010, T-021, T-022, T-028 (T-015 and T-018 for the manual end-to-end checks) |
| **Blocked by decisions** | D-13 (error state: default), D-09 (notice line: default)                      |
| **Parallel with**        | T-029, T-032, T-033, T-017                                                    |
| **Size**                 | L                                                                             |
| **Requirements**         | FR-28, FR-29, NFR-01, NFR-02, NFR-05                                          |

## Objective

Build the "Let's build something" section, with the contact details list and a fully validated, accessible contact form. It has the design's idle, sending, and sent states plus a failure state, and it's wired to `POST /api/contact`.

## References

- `docs/design-analysis.md` §4.12, §4.16
- `docs/api.md` §3 (`POST /api/contact`), §5
- `docs/design/extracted/design-source.html` L241–306, L420–446, L606–623
- Screenshots: `desktop-1440-contact.png`, `desktop-1440-contact-errors.png`, `desktop-1440-contact-loading.png`, `desktop-1440-contact-success.png`, `mobile-390-contact.png`

## Scope

- `sections/Contact.astro`: a two-column auto-fit grid; left `SectionHeading` (05), lead text, `ContactDetails`; right `ContactForm`.
- `contact/ContactDetails.astro`: `<dl>` from `content/profile.ts` (email `mailto:`, GitHub, LinkedIn, languages) plus the **PHONE row with the verified reveal** (ADR-0015, `design-analysis.md` §4.12): a "Show number" text button → `scripts/phone-reveal.ts` (`<phone-reveal>`) lazy-loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` **only on click**, renders the widget explicitly (`sitekey: PUBLIC_TURNSTILE_SITE_KEY`, `action: 'reveal-phone'`, `execution: 'execute'`, `appearance: 'interaction-only'`, `language` = page locale), calls `turnstile.execute()`, posts the token via `lib/api/phone.ts` (`POST /api/contact/phone`), validates the response (`tel` must match `^\+\d{8,15}$`), then replaces the button with a `tel:` link built with `setAttribute`/`textContent`, moves focus to it, and announces via `aria-live="polite"`. Verifying, failed, and no-JS states per the design analysis. The number is kept in memory only; the token is used once (a new `execute()` on retry). If `PUBLIC_TURNSTILE_SITE_KEY` is empty (dev), use the fake flow (the token `pass`).
- `contact/FormField.astro`:
  - `<label for>` row with an uppercase mono label (and counter for the message)
  - a `TypingField` (underline variant: ink, danger, and focus colours)
  - an error line `<p id=… role="alert">` linked via `aria-describedby`, plus `aria-invalid`
- `contact/ContactForm.astro` + `scripts/contact-form.ts` (`<contact-form>`):
  - `novalidate`; fields per §4.12 (autocomplete, inputmode, maxlength, placeholder); honeypot `website`; privacy notice line (D-09)
  - validation with contracts `validateContactInput`, using the design's exact messages per field code. Errors show after a non-empty blur or after a submit attempt, and submit focuses the first invalid field.
  - Ctrl/Cmd+Enter in the message submits
  - textarea auto-grows; `n/1000` counter
  - states: idle → sending (Button busy style, spinner, "Sending…", inputs disabled, status "Sending your message…") → sent (yellow "Message sent" with check, status "Thanks! I'll get back to you at {email}." via `textContent`, "Send another" resets and focuses Name)
  - failure (D-13): status text in danger colour, the button returns to idle, fields are kept and re-enabled
  - `clientRequestId` per submission attempt sequence (reused on retry after a network error)
- `lib/api/contact.ts`: `sendContactMessage()` with a type guard.
- `messages/contact.ts`: all copy (EN design text verbatim + PL drafts).

### Orchestrator note (2026-10-25): T-022 button states

`Button` renders `busy` as native `disabled` + `aria-busy` (the design's "sending" look) and `disabled` as `aria-disabled` only (the design's "sent" look; still focusable, so it does **not** block activation). Keep the sent button `type="button"` and guard your own submit handler. At runtime toggle `data-busy` / `data-done`, `disabled`, `aria-busy`, and `aria-disabled` (see `components/ui/Button.astro`).

## Allowed files

`apps/web/src/components/sections/Contact.astro`, `apps/web/src/components/contact/**`, `apps/web/src/scripts/contact-form.ts`, `apps/web/src/lib/api/contact.ts` (+ test), `apps/web/src/lib/api/phone.ts` (+ test), `apps/web/src/scripts/phone-reveal.ts`, `apps/web/astro.config.ts` (CSP: Turnstile `script-src` + `frame-src` only, via Change Request), `apps/web/src/lib/contact-*.ts` (pure helpers + tests), `apps/web/src/i18n/messages/contact.ts`, `e2e/contact.smoke.spec.ts` (only if T-040 is merged).

## Acceptance criteria

- **AC-1** Visual parity with the 5 referenced screenshots (idle, errors, loading, success, mobile).
- **AC-2** Validation messages and timing exactly as in the prototype (L420–446, L606–623). Submit with errors focuses the first invalid field. Errors are announced (`role="alert"`) and associated (`aria-describedby`).
- **AC-3** Outcomes: 200 → sent; 422 → server field errors mapped (no generic fallback when fields exist); 429 → rate-limit text; 503, network, or timeout → failure state. Unit-tested on the controller logic.
- **AC-4** Double submission is impossible (busy lock). "Send another" restores the idle state and focus.
- **AC-5** The echoed email in the status text is inserted with `textContent`.
- **AC-6** Without JS the form isn't functional, but the contact details (mailto, tel) remain fully usable, and the form is visibly inert rather than a broken submit. Choose and document: hide the form behind `[data-enhanced]` or show a "JavaScript required — email me instead" note.
- **AC-7** Manual end-to-end with `pnpm dev` (console mailer): a valid submission logs a redacted mail; a message containing `[fail]` shows the failure state.
- **AC-8** Phone reveal: the built HTML and JS contain no phone number (grep `dist/`). With the Turnstile test sitekey + fake verifier, the reveal shows the fixture number as a `tel:` link; failure and retry work; no request reaches `challenges.cloudflare.com` before the click; no CSP violations; keyboard and screen reader flows are verified.

## Validation

```
pnpm verify
pnpm dev     # manual AC-7
```

## Definition of done

Standard DoD plus screenshots of every state at 1440 and 390, and the PL strings list.
