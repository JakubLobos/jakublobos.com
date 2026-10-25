# T-015: Contact API and Resend mailer

|                          |                                       |
| ------------------------ | ------------------------------------- |
| **Wave**                 | 3                                     |
| **Depends on**           | T-010, T-011                          |
| **Blocked by decisions** | none (D-04 decided: Resend HTTPS API) |
| **Parallel with**        | T-012, T-013, T-016, T-021, T-022     |
| **Size**                 | M                                     |
| **Requirements**         | FR-47, NFR-05, NFR-06                 |

## Objective

Deliver contact-form submissions to the owner's inbox through a `Mailer` port, implemented with the **Resend HTTPS API** (SMTP is blocked on Railway Hobby). It needs validation, abuse controls, provider-level idempotency, and no persistence of personal data.

## References

- `docs/api.md` §3 (`POST /api/contact`), §4
- `docs/decisions/0010-contact-form-email-delivery.md`
- `docs/architecture.md` §5.4
- `docs/security.md` T4, T7, T9, T11, §8
- `docs/testing.md` §3 "Contact"
- `docs/research.md` §8 (Resend API facts)

## Scope

- `domain/contact/mailer.port.ts`: `Mailer.send(mail: OutgoingMail, opts: { idempotencyKey: string }): Promise<MailResult>`, where `OutgoingMail = { replyTo, subject, text }` and `MailResult = { ok: true } | { ok: false, code: 'timeout' | 'network' | 'rate_limited' | 'provider_error' | 'rejected' }`. It never throws.
- `domain/contact/contact.service.ts`:
  - validate and normalize (contracts rules) → honeypot → global caps (20/h, 60/day) → build mail → `send`
  - subject: `Portfolio contact: {name}`, with CR/LF and controls stripped, ≤ 80 chars
  - body: name, email, message, ISO time, page locale
  - returns `{ kind: 'sent' } | { kind: 'invalid', fields } | { kind: 'unavailable', retryAfterSeconds? }`
- `infra/mail/resend.mailer.ts`:
  - `POST https://api.resend.com/emails` with `Authorization: Bearer RESEND_API_KEY`, `Idempotency-Key: <clientRequestId>`, and JSON body `{ from: MAIL_FROM, to: [CONTACT_RECIPIENT_EMAIL], reply_to: replyTo, subject, text }`
  - 10 s timeout; injected `fetch`
  - maps 2xx → ok; 429 → `rate_limited`; 4xx → `rejected` (error log: likely configuration); 5xx → `provider_error`; abort → `timeout`; `TypeError` → `network`
  - verify field names against the current Resend docs and record that in the report
- `infra/mail/console.mailer.ts`: logs `{ subjectLength, textLength }` only; a message containing `[fail]` → `{ ok: false, code: 'provider_error' }` (non-production test hook).
- `infra/mail/index.ts`: `createMailer(config, deps)`.
- `http/routes/contact.routes.ts`: `jsonBody('16kb')`, require-json, allowed-origin, per-client 3/10 min + 10/24 h, schema, service → 200 / 422 / 503 (`MAIL_UNAVAILABLE`, `Retry-After`). Honeypot → 200 without sending.
- Wiring in `main.ts`.

## Allowed files

`apps/server/src/domain/contact/**`, `apps/server/src/infra/mail/**`, `apps/server/src/http/routes/contact.routes.ts` (+ tests), `apps/server/src/main.ts` (wiring), `apps/server/test/fixtures/resend/**`.

## Dependencies

None new.

## Acceptance criteria

- **AC-1** Field boundaries → correct 422 codes (`api.md` §3).
- **AC-2** `\r\nBcc: x@y.z` in the name never reaches the subject. `reply_to` equals the normalized email. `from` and `to` come from config only.
- **AC-3** The Resend request carries `Idempotency-Key` = `clientRequestId` (snapshot of the injected fetch call).
- **AC-4** Provider 429, 4xx, 5xx, timeout, and network → 503 `MAIL_UNAVAILABLE`. Honeypot → 200 with no send. Per-client 4th → 429. Global hourly and daily caps → 503.
- **AC-5** Logs contain no name, email, or message (log-capture test).
- **AC-6** Non-ASCII names (`Łukasz Żółć`) round-trip correctly in the JSON payload.

## Validation

```
pnpm verify
pnpm --filter @portfolio/server exec vitest run src/domain/contact src/infra/mail src/http/routes/contact
```

## Definition of done

Standard DoD.
