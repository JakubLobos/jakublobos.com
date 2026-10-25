# ADR-0015: Phone number behind a Turnstile-verified reveal; never in the repo or static HTML

- **Status:** Accepted (owner decisions D-24, D-25, 2026-10-25) · **Related:** FR-28, FR-50, `security.md` T20

## Context

The design shows the owner's phone number as a plain `tel:` link in the contact details. Numbers in static HTML are harvested by scrapers for spam calls, SMS scams, and data-broker lists. The owner asked for the number to be "behind a verification wall". The planning repository may be public, so the number must not be committed either.

Verified facts (Cloudflare Turnstile docs, 2026-10-25):

- Server-side validation: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response`, optional `remoteip` and `idempotency_key`. The response has `success`, `error-codes`, `hostname`, `action`, and `challenge_ts`.
- Tokens are valid for 300 s and **single-use** (a replay → `timeout-or-duplicate`). Docs advise validating `hostname` and `action`.
- Client: explicit rendering via `turnstile.render()` with `execution: 'execute'` (runs on `turnstile.execute()`) and `appearance: 'interaction-only'` (the widget is only visible if the visitor must interact).
- CSP: `script-src https://challenges.cloudflare.com` and `frame-src https://challenges.cloudflare.com`.
- Test keys exist: sitekey `1x00000000000000000000AA` / `1x00000000000000000000BB` (always pass, visible / invisible), `2x…AB` / `2x…BB` (always fail), `3x00000000000000000000FF` (forces an interactive challenge); secret `1x0000000000000000000000000000000AA` (pass), `2x…AA` (fail), `3x…AA` (duplicate-token error).

## Decision

- **Storage:** the number exists only in the API's environment (`CONTACT_PHONE`, E.164, a Railway variable). It's never in source, content modules, the static HTML, the JS bundle, JSON-LD, the sitemap, or OG images.
- **Repository:** the design bundle, its extracted source, and the reference screenshots use the placeholder `+48 000 000 000`. The original design file is kept by the owner outside the repo.
- **Reveal flow:**
  1. The PHONE row shows a "Show number" text button.
  2. Clicking it lazy-loads the Turnstile script (no third-party request before the click), runs an invisible or interaction-only challenge with `action: 'reveal-phone'`, and posts the token to `POST /api/contact/phone`.
  3. The API verifies the token with `siteverify` (`remoteip` = the resolved client IP, `idempotency_key` = a UUID) and checks `success`, `hostname ∈ TURNSTILE_ALLOWED_HOSTNAMES`, and `action === 'reveal-phone'`. Only then does it return `{ display, tel }` with `Cache-Control: no-store`.
  4. The UI replaces the button with a real `tel:` link.
- **Abuse limits:** per client 5 / 10 min and 20 / day; global 300 / day. Verification is fail-closed: siteverify errors or timeouts → 503, invalid tokens → 403.
- The number stays in page memory only (no `localStorage`). A reload means verifying again.

## Alternatives considered

| Option                                | Why not                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Plain number (as designed)            | Trivially harvested                                                                                      |
| JS obfuscation / assembled at runtime | Modern scrapers execute JavaScript                                                                       |
| Remove the phone entirely             | The owner wants recruiters to be able to call                                                            |
| Image of the number                   | Inaccessible (screen readers) and OCR-able                                                               |
| hCaptcha / reCAPTCHA                  | Cloudflare is already the site host; Turnstile has no puzzles in most cases and a privacy-focused design |

## Consequences

- A small design addition: the "Show number" button and a verifying state (same visual language as the other `<dd>` links). It's documented in `design-analysis.md`.
- Owner actions (D-23): create a Turnstile widget in the Cloudflare dashboard for `jakublobos.com` (invisible or managed), set `PUBLIC_TURNSTILE_SITE_KEY` (site build) and `TURNSTILE_SECRET_KEY` + `CONTACT_PHONE` (Railway).
- Turnstile processes browser signals only after the visitor clicks. This is disclosed in the privacy policy (Cloudflare as processor; legitimate interest / user-requested security check).
- The email address remains public as designed. The same pattern can be applied to it later if spam becomes a problem.

## Sources (accessed 2026-10-25)

- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- https://developers.cloudflare.com/turnstile/reference/content-security-policy/
- https://developers.cloudflare.com/turnstile/troubleshooting/testing/
