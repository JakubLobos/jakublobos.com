# T-018: Implementation report, round 1

- **Branch:** `task/T-018-phone-reveal`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

`POST /api/contact/phone` returns the owner's number (from `CONTACT_PHONE`) only after a `HumanVerifier` says `verified`. The Turnstile adapter makes one `fetch` to siteverify with a 5 s timeout and a zod-parsed response, and fails closed. The route is wired into `main.ts` as one small block. The orchestrator amendment (T-011 R2-01) is also done: the error handler only maps http-errors-style errors (`expose === true`) to 4xx.

## Files changed

| File                                                                | Change                                                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/server/src/domain/contact/human-verifier.port.ts`             | added: `HumanVerifier` port and result union                                                   |
| `apps/server/src/domain/contact/phone.ts` (+ test)                  | added: pure `formatPhone`                                                                      |
| `apps/server/src/infra/verification/turnstile.verifier.ts` (+ test) | added: siteverify adapter (also covers the fake verifier)                                      |
| `apps/server/src/infra/verification/fake.verifier.ts`               | added: token `pass` verifies                                                                   |
| `apps/server/src/http/routes/phone.routes.ts` (+ test)              | added: route, limits, no-store                                                                 |
| `apps/server/src/main.ts`                                           | modified: `createHumanVerifier` + route mount                                                  |
| `apps/server/src/http/middleware/error-handler.ts`                  | modified (amendment): 4xx only for `expose === true` errors                                    |
| `apps/server/src/app.test.ts`                                       | modified (amendment): one test, a thrown `{ status: 401 }` gives 500 `INTERNAL` at error level |

## Acceptance criteria

| #    | Criterion (short)                                                               | Status | Evidence                                                                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Valid token returns 200, number, no-store                                       | PASS   | `phone.routes.test.ts` "returns the formatted number..."; `turnstile.verifier.test.ts` "verifies a matching response..." (test secret, stubbed fetch); manual smoke of `main.ts` with the fake verifier: `200 no-store {"data":{"display":"+48 000 000 000","tel":"+48000000000"}}` |
| AC-2 | success:false, hostname, action, duplicate → 403; 5xx, timeout, malformed → 503 | PASS   | `turnstile.verifier.test.ts` `it.each` rejected/unavailable cases + timeout case; route 403/503 tests; error bodies asserted free of the number                                                                                                                                     |
| AC-3 | `remoteip` and fresh `idempotency_key`; secret never logged                     | PASS   | "verifies a matching response and sends secret, remoteip and a fresh idempotency_key"; route test asserts the secret is absent from logs                                                                                                                                            |
| AC-4 | Per-client and global limits                                                    | PASS   | "limits each client to 5 requests per 10 minutes" (429); "answers 503 with Retry-After once the global cap is spent"                                                                                                                                                                |
| AC-5 | No real number in the repo                                                      | PASS   | Fixtures use `+48000000000` only. The owner's number was never available to me.                                                                                                                                                                                                     |
| AC-6 | Production config refuses missing phone/secret and fake verifier                | PASS   | Already enforced and tested by T-011 `config.ts` / `config.test.ts` (lines 90-129); no change needed                                                                                                                                                                                |

## Validation output

```
$ pnpm verify
prettier --check: All matched files use Prettier code style!
eslint: clean; typecheck: 0 errors
apps/server: Test Files 12 passed (12), Tests 118 passed (118)
astro check: 0 errors, 0 warnings, 0 hints; astro build: 2 page(s) built
$ pnpm --filter @portfolio/server test -- phone verification
Test Files 12 passed (12)  Tests 118 passed (118)
$ pnpm --filter @portfolio/server exec vitest run --coverage
All files 88.57 stmts / 86.29 branches (thresholds met); domain/contact/phone.ts 100 / 87.5
```

## Tests added

- `phone.test.ts`: Polish grouping and the non-Polish fallback.
- `turnstile.verifier.test.ts`: success with request payload, replay and hostname/action/success rejections, 5xx, malformed JSON, unexpected shape, invalid-secret, network error and timeout all give `unavailable`; the fake verifier.
- `phone.routes.test.ts`: number only after verification (403 on a forged token), 422 on a bad body without calling the verifier, 503 when unconfigured, per-client 429, global 503 + `Retry-After`, Turnstile down gives 503, and no secret, number or IP in logs.
- `app.test.ts`: provider error with `status: 401` gives 500 `INTERNAL` at level 50.

## Assumptions (low-impact decisions taken)

- Siteverify error codes `missing-input-secret`, `invalid-input-secret` and `internal-error` map to `unavailable` (503), because they are our or Cloudflare's fault, not the visitor's. All other failures are `rejected` (403).
- The global 300/day cap is consumed after body validation and before the siteverify call, so it bounds Cloudflare calls. Verification failures still count against it.
- If `CONTACT_PHONE` is unset (development), the route returns 503 `VERIFICATION_UNAVAILABLE` (logged at error level) instead of inventing a number. E2E (T-041) must set `CONTACT_PHONE=+48000000000`.
- `formatPhone` fallback treats `+1`/`+7` codes as one digit and all others as two. The grouping is cosmetic; `tel` is always the unchanged E.164.
- An invalid body gives 422 `VALIDATION_FAILED` with `fields.turnstileToken: ['invalid']`.
- `createFakeVerifier` has no production guard of its own; config already refuses `HUMAN_VERIFIER=fake` in production (AC-6).

## Deviations from spec or design

- The merged `PhoneRevealRequestSchema` allows tokens up to 4096 chars; the task text says 2048 (Cloudflare's documented maximum). I left the merged contract alone. The 4 kb body limit still bounds the size. A CR can tighten it if wanted.

## Change Requests (shared surfaces / dependencies)

None needed. T-010 already contains the phone schemas and both error codes, and T-011 `config.ts` already has `CONTACT_PHONE`, `HUMAN_VERIFIER`, `TURNSTILE_SECRET_KEY` and `TURNSTILE_ALLOWED_HOSTNAMES` with the production rules. `respond.ts` still has its local `ApiErrorCode` mirror (a T-011 leftover, untouched).

## Open issues and follow-ups

- Production `TURNSTILE_ALLOWED_HOSTNAMES` defaults to `localhost`; the owner must set it to `jakublobos.com` on Railway (D-23).
- The new route imports `PhoneRevealRequestSchema` from `@portfolio/contracts/schemas` but does not validate its own response with `PhoneRevealResponseSchema`. The shape is built from `formatPhone` and covered by tests.
