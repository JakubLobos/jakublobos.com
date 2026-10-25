# T-011: API foundation (config, logging, app factory, CORS, client IP, middleware, health, shutdown)

|                          |                               |
| ------------------------ | ----------------------------- |
| **Wave**                 | 2                             |
| **Depends on**           | T-001                         |
| **Blocked by decisions** | none                          |
| **Parallel with**        | T-010, T-020                  |
| **Size**                 | L                             |
| **Requirements**         | FR-49, NFR-05, NFR-07, NFR-11 |

## Objective

Build the API skeleton every route plugs into. It runs on Railway at `api.jakublobos.com` and is called cross-origin from `jakublobos.com`. It provides:

- validated configuration
- redacted structured logging
- a testable `createApp(deps)` with the full middleware pipeline: CORS allowlist, Origin check, client-IP resolution, and the JSON error envelope
- shared domain utilities
- a composition root with graceful shutdown

## References

- `docs/architecture.md` §5.1, §5.2 (pipeline order, client IP), §7, §9
- `docs/api.md` §1 (CORS, envelope, error codes), §4
- `docs/security.md` §2 (T8, T9, T11, T15, T18), §4 (API headers), §6
- `docs/decisions/0014-hosting-cloudflare-workers-and-railway.md`
- `.env.example` (API section: all variables)

## Scope

- `src/config.ts`: zod schema for every API variable in `.env.example`.
  - `CORS_ALLOWED_ORIGINS` → `string[]` of origins (scheme + host + optional port, no path).
  - `CLIENT_IP_SOURCE` → `'socket' | 'x-real-ip'`.
  - Production rules (`architecture.md` §7): refuse the fake providers and console mailer; require `OPENAI_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `CONTACT_RECIPIENT_EMAIL`; all CORS origins must be `https:`.
  - Export `loadConfig(env)`; `ConfigError` lists variable names only.
- `src/logger.ts`: pino with redaction (`req.headers.authorization`, `req.headers.cookie`, `req.headers["x-real-ip"]`, `*.apiKey`, `*.password`, `body`, `email`, `name`). pino-http logs method, path, status, duration, and request ID only. **No IPs.**
- `src/domain/shared/`:
  - `clock.ts` (`Clock`, `systemClock`, `FakeClock`)
  - `ids.ts` (`IdGenerator`)
  - `ttl-cache.ts` (bounded, clock-driven)
  - `result.ts`
- `src/http/`:
  - `respond.ts`
  - `client-ip.ts`: `resolveClientIp(req, source)`. With `x-real-ip`, take the header, trimmed, if `net.isIP() !== 0`; otherwise fall back to the socket address.
  - `middleware/`:
    - `request-id.ts`
    - `security-headers.ts` (helmet + `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`; HSTS only in production; no `x-powered-by`)
    - `cors.ts` (`cors` package with the allowlist function, methods `GET,POST,OPTIONS`, `allowedHeaders: ['Content-Type','X-Request-Id']`, `exposedHeaders: ['X-Request-Id','Retry-After','RateLimit','RateLimit-Policy']`, `maxAge: 600`, `credentials: false`)
    - `allowed-origin.ts` (403 `FORBIDDEN_ORIGIN` on POST without an allowlisted `Origin`)
    - `require-json.ts` (415)
    - `error-handler.ts` (400 `INVALID_JSON`, 413, 500 `INTERNAL`)
    - `not-found.ts`
  - `rate-limit.ts`:
    - `createClientLimiter({ windowMs, limit })` on express-rate-limit 8: `keyGenerator` = `ipKeyGenerator(resolveClientIp(...), 56)`, `standardHeaders: 'draft-8'`, our envelope + `Retry-After`. Because `trust proxy` is off, disable the library's proxy validations that would misfire on Railway, and document why in a comment.
    - `createGlobalCap({ windows: [{ windowMs, limit }...] })`: fixed-window counters for global caps, called explicitly by route handlers after validation; returns `{ ok } | { ok: false, retryAfterSeconds }`.
  - `routes/health.routes.ts` (injected `checkDatabase`).
- `src/app.ts`: `createApp(deps)` with the pipeline order from `architecture.md` §5.2 and a `RouteModule` registration list. `trust proxy` stays **off**.
- `src/main.ts`: composition root, server timeouts (`headersTimeout 15s`, `requestTimeout 20s`, `keepAliveTimeout 5s`), `onShutdown` hooks, graceful exit ≤ 10 s.

## Out of scope

DB (T-012), review providers (T-013), routes (T-014/T-015), the Worker (T-016), Docker and Railway (T-050).

## Allowed files

`apps/server/src/**` (foundation folders only), `apps/server/package.json`, `apps/server/vitest.config.ts`, `pnpm-lock.yaml`.

## Dependencies (exact)

`helmet@8.3.0`, `cors@2.8.6`, `express-rate-limit@8.7.1`, `pino@10.4.0`, `pino-http@11.0.0`, `zod@4.6.7`; dev `@types/cors@2.8.19`, `pino-pretty@13.2.0`, `supertest@7.3.1`, `@types/supertest@7.2.1`.

## Interfaces / contracts

`createApp`, `AppDeps`, `RouteModule`, `respond.ok/fail`, `jsonBody(limit)`, `createClientLimiter`, `createGlobalCap`, `resolveClientIp`, `Clock`/`FakeClock`, `IdGenerator`, `TtlCache`, `loadConfig`/`Config`, `onShutdown`.

## Acceptance criteria

- **AC-1** Config: development defaults load. Production rejects fakes, missing secrets, and non-https origins, naming the variables without printing values.
- **AC-2** CORS:
  - a preflight `OPTIONS` from `http://localhost:4321` → 204 with `Access-Control-Allow-Origin` echoing the origin, `Access-Control-Max-Age: 600`, and no `Allow-Credentials`
  - from `https://evil.example` → no CORS headers
  - a POST with a foreign or missing Origin → 403 envelope
- **AC-3** `resolveClientIp` matrix: valid IPv4 and IPv6 `X-Real-IP` used in `x-real-ip` mode; garbage, missing, and comma lists → socket fallback; `socket` mode ignores the header. Two different `X-Real-IP` values get separate rate-limit buckets.
- **AC-4** 400/413/415/403/404/500 envelopes with `requestId`; `X-Request-Id` on every response; headers per `security.md` §4 (API); HSTS only in production.
- **AC-5** The client limiter returns 429 with `Retry-After` and `RateLimit` headers; the global cap helper enforces both windows.
- **AC-6** Logs never contain bodies, IPs (including `X-Real-IP`), cookies, or authorization (log-capture test).
- **AC-7** Health 200 / 503. Graceful shutdown runs hooks once and exits 0.

## Validation

```
pnpm verify
pnpm --filter @portfolio/server test:coverage
pnpm --filter @portfolio/server start   # curl -i localhost:3000/api/health ; curl -i -X OPTIONS -H 'Origin: http://localhost:4321' -H 'Access-Control-Request-Method: POST' localhost:3000/api/health
```

## Definition of done

Standard DoD.
