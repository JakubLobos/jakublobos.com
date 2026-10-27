# HTTP API contract

**Shared surface.** This document and `packages/contracts` are the interface between frontend and backend tasks. Change them only through the shared-surface procedure in [`agent-workflow.md`](agent-workflow.md#shared-surfaces). The zod schemas in `packages/contracts/src/schemas.ts` are the executable form of this document. If they disagree, report it.

## 1. Conventions

- Production base URL: **`https://api.jakublobos.com`** (site: `https://jakublobos.com`). Paths start with `/api`. The web app reads the base URL from `PUBLIC_API_BASE_URL` (empty in `astro dev`, where `/api` is proxied).
- **CORS:** responses carry `Access-Control-Allow-Origin` only for origins in `CORS_ALLOWED_ORIGINS`:
  - production: `https://jakublobos.com`
  - development: `http://localhost:4321`
  - e2e and preview: `http://localhost:8787`

  Allowed methods are `GET, POST, OPTIONS`; allowed headers `Content-Type, X-Request-Id`; `Access-Control-Max-Age: 600`. Credentials are never used (`credentials: 'omit'`, no cookies).

- Requests with a body must be `Content-Type: application/json` (otherwise `415`). Limits: guestbook `8 KB`, contact `16 KB` (otherwise `413`).
- `POST` requests must carry an `Origin` header in the allowlist, otherwise `403 FORBIDDEN_ORIGIN`.
- Every response carries `X-Request-Id`.
- Success envelope: `{ "data": { … } }`
- Error envelope. Clients localize from `code` and `fields`, never from `message`:
  ```json
  {
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "Request validation failed",
      "fields": { "body": ["links_not_allowed"] },
      "requestId": "4f1c…"
    }
  }
  ```
- `429` and `503` responses include `Retry-After` (seconds). Per-client limits also send IETF `RateLimit` / `RateLimit-Policy` headers (`standardHeaders: 'draft-8'`).

### 1.1 Error codes

| `code`                     | HTTP | Meaning                                                                    |
| -------------------------- | ---- | -------------------------------------------------------------------------- |
| `INVALID_JSON`             | 400  | Body isn't parseable JSON                                                  |
| `FORBIDDEN_ORIGIN`         | 403  | `Origin` missing or not allowlisted on POST                                |
| `NOT_FOUND`                | 404  | Unknown `/api` route                                                       |
| `PAYLOAD_TOO_LARGE`        | 413  | Body over the limit                                                        |
| `UNSUPPORTED_MEDIA_TYPE`   | 415  | Not `application/json`                                                     |
| `VALIDATION_FAILED`        | 422  | See `fields`                                                               |
| `RATE_LIMITED`             | 429  | Per-client limit hit                                                       |
| `GUESTBOOK_BUSY`           | 503  | Global guestbook cap (hourly or daily) reached                             |
| `MAIL_UNAVAILABLE`         | 503  | Mail delivery failed or global contact cap reached                         |
| `VERIFICATION_FAILED`      | 403  | Turnstile token invalid, expired, reused, or for the wrong hostname/action |
| `VERIFICATION_UNAVAILABLE` | 503  | Turnstile verification unreachable, or the global reveal cap was reached   |
| `INTERNAL`                 | 500  | Unexpected error (details only in server logs, by `requestId`)             |

### 1.2 Field error codes (`FieldErrorCode`)

`required` · `empty` · `too_short` · `too_long` · `invalid` · `invalid_characters` · `links_not_allowed` · `contact_info_not_allowed`

## 2. Shared constants (`packages/contracts/src/constants.ts`)

```ts
export const LOCALES = ['en', 'pl'] as const;
export const DEFAULT_LOCALE = 'en';
export const PAINT_IDS = ['red', 'coral', 'yellow', 'purple', 'violet', 'blue'] as const;
export const DEFAULT_PAINT = 'yellow';
export const GUESTBOOK_MESSAGE_MAX_LENGTH = 120; // UTF-16 code units (= HTML maxlength)
export const GUESTBOOK_RETENTION_LIMIT = 100; // total rows (pending + approved)
export const GUESTBOOK_MAX_PENDING = 1; // newest wins (D-05)
export const CONTACT_NAME_MIN = 2;
export const CONTACT_NAME_MAX = 60;
export const CONTACT_EMAIL_MAX = 120;
export const CONTACT_MESSAGE_MIN = 10;
export const CONTACT_MESSAGE_MAX = 1000;
```

Shared pure validation rules live in `packages/contracts/src/rules/` (`guestbook-content.ts`, `contact-fields.ts`). Silent quality rules and blocked terms are **server-only** (`apps/server/src/domain/guestbook/`), so they aren't shipped to clients.

## 3. Endpoints

### `GET /api/health`

`200 { "data": { "status": "ok", "db": "ok" } }`, or `503` with the `INTERNAL` envelope if `SELECT 1` fails. Not rate-limited. `Cache-Control: no-store`.

### `GET /api/guestbook/latest`

Returns the newest **approved** message. This is the only public read of guestbook data (D-05, D-17).

```jsonc
// 200
{ "data": { "message": { "id": "0b7a2c1e-…", "body": "Love the paint drips!", "paint": "yellow", "publishedAt": "2026-10-25T12:00:00.000Z" } } }
// 200, nothing published yet
{ "data": { "message": null } }
```

- `id` is the public UUID.
- `Cache-Control: no-cache` + `ETag` (a revalidated request returns `304`).
- Rate limit: 60 / minute / client.

### `GET /api/guestbook/submissions/:clientRequestId`

Review progress of one submission (ADR-0017). The key is the `clientRequestId` the browser sent with the `POST`: a random UUID, so it works as an unguessable token.

```jsonc
// 200
{ "data": { "status": "pending" } }
{ "data": { "status": "approved" } }
{ "data": { "status": "superseded" } }
{ "data": { "status": "rejected", "reason": "inappropriate" } } // inappropriate | off_topic | impersonation | personal_data
// 404 NOT_FOUND: unknown, pruned (after 24 h) or never recorded (for example a duplicate text)
// 400 VALIDATION_FAILED: the id is not a UUID
```

- The reason is one of four deliberately coarse labels mapped from the internal outcome (`guestbook-moderation.md` §2.1). The response never contains the text, scores, categories, provider names or internal reasons.
- `Cache-Control: no-store`. Rate limit: 30 / minute / client.

### `POST /api/guestbook`

Submit a message for review.

```jsonc
{
  "body": "Hello from Kraków!",
  "paint": "violet",
  "clientRequestId": "d1b7c0b4-3f1e-4d6c-9a52-2b9f0b8f61a1",
  "locale": "pl", // optional: page locale ("en" | "pl"); server defaults to "en"
  "website": "",
}
```

Processing order: per-client rate limit → schema → normalization → feedback rules (422) → honeypot → global caps → silent rules (quality, blocked terms, recently rejected) → idempotency and dedupe → insert as the single pending row (superseding any older pending) → nudge the review worker. Details in [`guestbook-moderation.md`](guestbook-moderation.md#4-submission-flow).

| Outcome                                                                                            | Response                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accepted for review                                                                                | `202 { "data": { "status": "received" } }`                                                                                                                                                                                                                               |
| Duplicate `clientRequestId`, same normalized text already stored, honeypot filled, silent rule hit | `202` (byte-identical; nothing new stored)                                                                                                                                                                                                                               |
| Invalid                                                                                            | `422 VALIDATION_FAILED`. `fields.body`: `required` · `invalid` (not a string) · `empty` · `too_long` · `invalid_characters` · `links_not_allowed` · `contact_info_not_allowed`. `fields.paint`: `required` · `invalid`. `fields.clientRequestId`: `required` · `invalid` |
| Per-client limit                                                                                   | `429 RATE_LIMITED`                                                                                                                                                                                                                                                       |
| Global cap reached                                                                                 | `503 GUESTBOOK_BUSY` + `Retry-After`                                                                                                                                                                                                                                     |

Responses **never reveal review outcomes** (uniform 202), so the filters can't be probed.

Normalization (forbidden characters and well-formedness are checked on the NFC text **before** trimming and collapsing, so e.g. U+FEFF can never be turned into a space):

1. NFC.
2. Trim.
3. Collapse whitespace runs into one space.

Feedback rules:

- 1–120 UTF-16 units.
- Forbidden characters: C0/C1 controls, bidi controls U+202A–202E and U+2066–2069, U+200B, U+2060, U+FEFF, and lone surrogates (`!isWellFormed()`). ZWJ (U+200D) is allowed.
- Links: `http(s)://`, `www.`, or `label.tld` where the TLD is in the curated list **and written in lowercase** in the original text, using Unicode-aware boundaries (so `пример.ru` and `żółć.pl` are caught, `to.coś` isn't). Passes: `Node.js`, `e.g.`, `i.e.`, `v1.2`, `3.14`, `ASP.NET`, `job.Me` (missing space after a period), and the tech allowlist `socket.io`. Anything that slips through is still subject to moderation and the suitability check.
- Contact info: an email address, or 9+ digits.

### `POST /api/contact`

```jsonc
{
  "name": "Jane Doe",
  "email": "jane@company.com",
  "message": "I'd love to talk about…",
  "clientRequestId": "…uuid…",
  "locale": "en", // optional: page locale; server defaults to "en"
  "website": "",
}
```

| Field     | Normalization        | Rules → codes                                                                                     |
| --------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| `name`    | NFC, trim            | 2–60 → `too_short` / `too_long`; control chars or newlines → `invalid_characters`                 |
| `email`   | trim                 | required → `required`; ≤ 120 → `too_long`; `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` → `invalid`            |
| `message` | NFC, trim, CRLF → LF | 10–1000 → `too_short` / `too_long`; control chars other than `\n` and `\t` → `invalid_characters` |

| Outcome                               | Response                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------- |
| Handed to the mail provider           | `200 { "data": { "status": "sent" } }`                                    |
| Retry with the same `clientRequestId` | `200` (the provider's `Idempotency-Key` prevents a second email for 24 h) |
| Honeypot filled                       | `200` (silently dropped)                                                  |
| Invalid                               | `422 VALIDATION_FAILED`                                                   |
| Per-client limit                      | `429 RATE_LIMITED`                                                        |
| Provider failure or global cap        | `503 MAIL_UNAVAILABLE`                                                    |

### `POST /api/contact/phone`

Reveal the owner's phone number after a Cloudflare Turnstile check ([ADR-0015](decisions/0015-phone-number-protection.md)).

```jsonc
// request
{ "turnstileToken": "0.AbC…" }          // from turnstile.execute(); single-use, valid 300 s
// 200 (Cache-Control: no-store)
{ "data": { "display": "+48 000 000 000", "tel": "+48000000000" } }
```

The server verifies via `siteverify` (`remoteip`, `idempotency_key`) and requires `success`, `hostname ∈ TURNSTILE_ALLOWED_HOSTNAMES`, and `action === "reveal-phone"`. Failure → `403 VERIFICATION_FAILED`; provider error or timeout → `503 VERIFICATION_UNAVAILABLE`. The number is never part of an error response.

## 4. Rate limits and caps (server constants)

| Route                                | Per client (`X-Real-IP` on Railway; IPv6 /56) | Global (accepted requests only)                                            |
| ------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------- |
| `GET /api/guestbook/latest`          | 60 / 1 min                                    | —                                                                          |
| `GET /api/guestbook/submissions/:id` | 30 / 1 min                                    | —                                                                          |
| `POST /api/guestbook`                | 3 / 10 min **and** 10 / 24 h                  | **20 / h and 50 / 24 h** → `503 GUESTBOOK_BUSY`                            |
| `POST /api/contact`                  | 3 / 10 min **and** 10 / 24 h                  | **20 / h and 60 / 24 h** (below Resend's 100/day) → `503 MAIL_UNAVAILABLE` |
| `POST /api/contact/phone`            | 5 / 10 min **and** 20 / 24 h                  | 300 / 24 h → `503 VERIFICATION_UNAVAILABLE`                                |

Per-client limiters count every request, including invalid ones, to slow brute-forcing of the rules. Global caps count only requests that pass validation and honeypot checks. They bound archive displacement, paid review calls, and email volume regardless of IP spoofing.

## 5. Client mapping (web)

| Result                                        | Guestbook UI                                                                                                               | Contact UI                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 202 / 200                                     | Modal opens in "Checking your note…" and polls the status endpoint (ADR-0017); input cleared                               | "Message sent" state                                 |
| status `approved` / `rejected` / `superseded` | Modal states "Your note is live!" (quote refetched), "didn't pass review" + localized general reason, "someone was faster" | n/a                                                  |
| status `404`, or 60 s without a result        | Modal: "This is taking longer than usual…"; polling stops                                                                  | n/a                                                  |
| 422                                           | inline localized field error; text kept                                                                                    | per-field errors (design copy) + focus first invalid |
| 429                                           | "You've left a few marks already. Try again in a few minutes."                                                             | "Too many messages. Please try again later."         |
| 503 / network / timeout / unexpected          | "Couldn't send that right now. Please try again in a moment."                                                              | failure status; button back to idle; fields kept     |

Copy lives in `apps/web/src/i18n/messages/errors.ts` (generic) and `messages/guestbook.ts` / `messages/contact.ts` (field codes).
