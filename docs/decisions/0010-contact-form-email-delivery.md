# ADR-0010: Contact form delivered via the Resend HTTPS API behind a Mailer interface

- **Status:** Accepted (owner: "email it to me, don't store"; provider decided 2026-10-25 because Railway blocks SMTP) · **Related:** FR-29, FR-47, D-04

## Context

- The owner wants contact messages emailed and **not stored**.
- The API runs on Railway Hobby (ADR-0014). Railway staff confirm outbound **SMTP is blocked on Free, Trial, and Hobby** (ports 25, 465, 587, 2525) and recommend HTTPS-based transactional email services.
- **Resend** (verified 2026-10-25): free plan with 3,000 emails/month, 100 emails/day, 3 domains. `POST https://api.resend.com/emails` with `Authorization: Bearer`; fields `from`, `to`, `subject`, `text`, `reply_to`; an `Idempotency-Key` header (unique per request, ≤ 256 chars, expires after 24 h).

## Decision

- `Mailer` port (`domain/contact/mailer.port.ts`) with two implementations:
  - `ResendMailer`: global `fetch` with a 10 s timeout, no SDK. Sends `Idempotency-Key = clientRequestId`, so a visitor's retry never sends twice.
  - `ConsoleMailer`: development and tests; refused in production.
- `from = MAIL_FROM` (for example `Portfolio <contact@jakublobos.com>`, on the verified domain), `to = CONTACT_RECIPIENT_EMAIL`, `reply_to` = the visitor's email, plain text, fixed subject template.
- A global cap of **60 sent per day** and 20 per hour stays below Resend's 100/day free limit.
- Nothing is persisted. Logs contain outcomes only.

## Alternatives considered

| Option                              | Why not                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| SMTP via nodemailer (previous plan) | Blocked on Railway Hobby; would force the $20/month Pro plan                                                              |
| Postmark / SendGrid / Mailgun       | Also HTTPS and fine; Resend has a simple API, idempotency keys, and a free tier that fits. The port keeps swapping cheap. |
| Store + email                       | The owner declined storing contact data                                                                                   |

## Consequences

- Owner action: verify `jakublobos.com` in Resend (SPF/DKIM DNS records in Cloudflare).
- Removes the `nodemailer` dependency.
- A Resend outage shows the form's failure state (D-13); the visitor keeps their text and can retry, idempotently.

## Sources (accessed 2026-10-25)

- https://resend.com/pricing , https://resend.com/docs/api-reference/emails/send-email
- Railway SMTP policy: https://station.railway.com/questions/smpt-hobby-plan-2845df83 , https://docs.railway.com/networking/outbound-networking
