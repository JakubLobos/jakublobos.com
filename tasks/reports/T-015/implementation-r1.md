# T-015: Implementation report, round 1

- **Branch:** `task/T-015-contact-api` @ `02dba69` (code); report in the following commit
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

`POST /api/contact` validates with the contracts schema and rules, drops honeypot submissions silently, spends the global caps (20/h, 60/day) only on accepted mail, and sends through a `Mailer` port. `ResendMailer` is a single injected `fetch` with a 10 s `AbortSignal.timeout`, and its responses are parsed with zod. A `ConsoleMailer` is the non-production default. The route file owns its limiters (3/10 min, 10/24 h) and global caps, and `main.ts` gets one self-contained block.

## Files changed

| File                                                | Change                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/domain/contact/mailer.port.ts`     | added: `Mailer`, `OutgoingMail`, `MailResult`                                                                 |
| `apps/server/src/domain/contact/contact.service.ts` | added: normalize → validate → honeypot → cap → build mail → send. Cap is injected structurally (`ContactCap`) |
| `apps/server/src/domain/contact/fake-mailer.ts`     | added: recording mailer for tests                                                                             |
| `apps/server/src/infra/mail/resend.mailer.ts`       | added: Resend HTTPS client and status mapping                                                                 |
| `apps/server/src/infra/mail/console.mailer.ts`      | added: logs `{subjectLength, textLength}`; `[fail]` hook                                                      |
| `apps/server/src/infra/mail/index.ts`               | added: `createMailer(config.mail, { fetch, logger })`                                                         |
| `apps/server/src/http/routes/contact.routes.ts`     | added: route, limiters, caps, error mapping                                                                   |
| `apps/server/src/main.ts`                           | modified: registers the contact route                                                                         |
| `apps/server/test/fixtures/resend/*.json`           | added: success and validation-error bodies                                                                    |
| `*.test.ts` (service, mail, routes)                 | added                                                                                                         |

## Acceptance criteria

| #    | Criterion (short)                      | Status | Evidence                                                                                                                                                                                                                |
| ---- | -------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Field boundaries → 422 codes           | PASS   | `contact.service.test.ts` "rejects …" (name 1/61, email required/invalid/121, message 9/1001, control chars) + "accepts the exact boundaries"; route 422 tests                                                          |
| AC-2 | No header injection; reply_to; from/to | PASS   | "rejects CRLF in the name…", "keeps CR/LF header injection out of the subject" (U+2028 survives validation, stripped); mail snapshot asserts `replyTo`; `resend.mailer` test asserts `from`/`to` come from options only |
| AC-3 | `Idempotency-Key` = `clientRequestId`  | PASS   | `resend mailer › posts the documented request…` (header snapshot); route test asserts key reaches the mailer                                                                                                            |
| AC-4 | Failure mapping, honeypot, 4th, caps   | PASS   | route `it.each` for 429/4xx/5xx/network/timeout → 503 + `Retry-After`; honeypot 200 no send; 4th → 429; 21st accepted (distinct IPs) → 503                                                                              |
| AC-5 | No PII in logs                         | PASS   | `contact.routes.test.ts › never logs the name, email or message`; console mailer test; Resend 4xx log contains only status and error name                                                                               |
| AC-6 | Non-ASCII round-trip                   | PASS   | `Łukasz Żółć` in JSON payload and subject assertions                                                                                                                                                                    |

## Validation output

```
$ pnpm verify          -> exit 0 (prettier, eslint, typecheck, tests, build all green)
$ pnpm --filter @portfolio/server test -- src/domain/contact src/infra/mail src/http/routes/contact
 Test Files  12 passed (12)
      Tests  135 passed (135)
```

(The filter argument is not honoured by the script's `vitest run "--"`, so the count covers the whole server suite, including these three files.)

## Resend API verification (2026-10-25)

Checked against the published OpenAPI spec (`resend/resend-openapi`, `SendEmailRequest`): request fields `from`, `to`, `subject`, `reply_to`, `text`; response `SendEmailResponse { id }`. The docs pages confirm `Authorization: Bearer`, `Idempotency-Key` (≤ 256 chars, 24 h), 400 `invalid_idempotency_key`, 409 `invalid_idempotent_request` / `concurrent_idempotent_requests`, and 429 `rate_limit_exceeded` / `daily_quota_exceeded`. The 409s fall in the generic 4xx → `rejected` bucket, which is why they surface as 503.

## Tests added

- `domain/contact/contact.service.test.ts`: boundaries, normalization, mail contents/idempotency key, subject sanitising, honeypot not spending the cap, cap and mailer failure mapping.
- `infra/mail/mail.test.ts`: request snapshot, status mapping, malformed 2xx, real short timeout, network error, log hygiene, console mailer, `createMailer`.
- `http/routes/contact.routes.test.ts`: 200/422/415/413/403, honeypot, per-client 429, hourly cap 503, log capture, provider failures through the real Resend mailer.

## Assumptions

- Honeypot is checked after validation (task order), so an invalid honeypot submission still gets 422.
- Schema-shape failures (wrong types, bad UUID) map to `fields.<name> = ['invalid']`, or `too_long` for oversize raw input; a non-object body gives 422 without `fields`.
- `Retry-After` on provider failures is a fixed 30 s; on caps it is the window remainder.
- A 2xx from Resend with no `id` is treated as `provider_error`.
- Limiters run before body parsing, so 415/413/invalid requests count against the per-client budget (api.md §4).

## Deviations from spec or design

- `ContactOutcome.unavailable` carries an extra `reason` field (for outcome-only logging). `domain/contact/fake-mailer.ts` is an extra test helper within the allowed directory.

## Change Requests

- None. `respond.ts` still has its local `ApiErrorCode` mirror; I did not touch it.

## Open issues and follow-ups

- None known. The per-client 10/24 h limiter is wired but not exercised separately (the 3/10 min limiter trips first with real time).
