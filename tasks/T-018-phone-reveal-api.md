# T-018: Phone reveal API with Cloudflare Turnstile verification

|                          |                                          |
| ------------------------ | ---------------------------------------- |
| **Wave**                 | 3                                        |
| **Depends on**           | T-010, T-011                             |
| **Blocked by decisions** | none (D-24 answered)                     |
| **Parallel with**        | T-012, T-013, T-015, T-016, T-021, T-022 |
| **Size**                 | S                                        |
| **Requirements**         | FR-50, NFR-05, NFR-06                    |

## Objective

Serve the owner's phone number only to visitors who pass a Cloudflare Turnstile check. The number lives exclusively in the API environment.

## References

- `docs/decisions/0015-phone-number-protection.md` (normative: verification rules, limits)
- `docs/api.md` §3 (`POST /api/contact/phone`), §4
- `docs/security.md` T20, §8
- `docs/testing.md` §3 "Phone reveal"

## Scope

- **Contracts** (Change Request to T-010's package, or T-010 includes it if not yet merged): `PhoneRevealRequestSchema` (`{ turnstileToken: string 1..2048 }`), `PhoneRevealResponseSchema` (`{ display: string, tel: string /^\+\d{8,15}$/ }`), and error codes `VERIFICATION_FAILED` (403) and `VERIFICATION_UNAVAILABLE` (503).
- `domain/contact/human-verifier.port.ts`: `HumanVerifier.verify(token, { remoteIp, expectedAction })` → `{ kind: 'verified' } | { kind: 'rejected', reason } | { kind: 'unavailable' }`. It never throws.
- `infra/verification/turnstile.verifier.ts`:
  - `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` (JSON: `secret`, `response`, `remoteip`, `idempotency_key`), 5 s timeout, injected `fetch`
  - zod-parses the response
  - verified ⇔ `success === true` ∧ `hostname ∈ TURNSTILE_ALLOWED_HOSTNAMES` ∧ `action === 'reveal-phone'`
  - HTTP or network errors → `unavailable`
  - `infra/verification/fake.verifier.ts`: token `pass` → verified, otherwise rejected; refused in production
- `domain/contact/phone.ts` (pure): `formatPhone(e164)` → `{ display, tel }`. A Polish 9-digit number is grouped `+48 XXX XXX XXX`; others fall back to the country code + groups of 3.
- `http/routes/phone.routes.ts`: `POST /api/contact/phone`, with `jsonBody('4kb')`, require-json, allowed-origin, per-client 5 / 10 min + 20 / day, global 300 / day (→ 503 `VERIFICATION_UNAVAILABLE` + `Retry-After`), verifier, `200 { data: { display, tel } }` with `Cache-Control: no-store`.
- Config (Change Request to T-011's `config.ts` if already merged):
  - `CONTACT_PHONE` (E.164; required in production)
  - `TURNSTILE_SECRET_KEY` (secret; required in production)
  - `TURNSTILE_ALLOWED_HOSTNAMES` (comma list; production `jakublobos.com`)
  - `HUMAN_VERIFIER=turnstile|fake` (fake refused in production)
- Wiring in `main.ts`.

### Orchestrator amendment (2026-10-25): T-011 review R2-01

Also fix `apps/server/src/http/middleware/error-handler.ts`: `clientErrorInfo` currently maps **any** thrown object with a 4xx `status`/`statusCode` to 400 `INVALID_JSON`. Limit that branch to body-parser / http-errors errors (e.g. `expose === true` and a known body-parser `type`). Everything else falls through to 500 `INTERNAL`, logged at `error`. Add one test: a route throwing `Object.assign(new Error('x'), { status: 401 })` → 500. Details: `tasks/reports/T-011/review-r2.md` R2-01. Allowed: `error-handler.ts` and its test.

## Out of scope

The UI (T-030). The Turnstile widget setup in the dashboard (owner, D-23 / T-050).

## Allowed files

`packages/contracts/src/**` (phone reveal schemas only, via CR if T-010 is merged), `apps/server/src/domain/contact/{human-verifier.port,phone}.ts` (+ tests), `apps/server/src/infra/verification/**`, `apps/server/src/http/routes/phone.routes.ts` (+ tests), `apps/server/src/config.ts` (new variables, via CR), `apps/server/src/main.ts` (wiring), `apps/server/src/http/middleware/error-handler.ts` (+ test; amendment above).

## Acceptance criteria

- **AC-1** Valid token (fake `pass`, and the real verifier with Turnstile test secret `1x0000000000000000000000000000000AA` against a stubbed siteverify response) → 200 with the formatted number and `Cache-Control: no-store`.
- **AC-2** `success: false`, a wrong `hostname`, a wrong `action`, or a duplicate token (`timeout-or-duplicate`) → 403 `VERIFICATION_FAILED`. Siteverify 5xx, timeout, or malformed JSON → 503 `VERIFICATION_UNAVAILABLE`. The number is never in an error response.
- **AC-3** The siteverify request carries `remoteip` (from `resolveClientIp`) and a fresh `idempotency_key`. The secret is never logged.
- **AC-4** Per-client and global limits enforced (429 / 503).
- **AC-5** `grep -r` for the owner's real number in the repository finds nothing; the tests use a fixture number `+48000000000`.
- **AC-6** Production config refuses a missing `CONTACT_PHONE` / `TURNSTILE_SECRET_KEY` and the fake verifier.

## Validation

```
pnpm verify
pnpm --filter @portfolio/server test -- phone verification
```

## Definition of done

Standard DoD.
