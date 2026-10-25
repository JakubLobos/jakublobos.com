# T-011: Implementation report, round 1

- **Branch:** `task/T-011-server-foundation`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Built the API foundation in `apps/server`: zod config (`loadConfig`, `ConfigError` naming variables only), redacted pino logger, `createApp(deps)` with the pipeline from architecture 5.2, shared domain utilities, CORS allowlist, Origin check, client-IP resolution, client limiter and global caps, JSON error envelope, health route, shutdown manager and a composition root with server timeouts. Replaces the placeholder `main.ts` (T-001 review R1-04: the ad-hoc `PORT` parse is now zod-validated, so `PORT=""` defaults to 3000 and `PORT=abc` exits 1).

## Files changed

| File                                                                                                                                       | Change                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `apps/server/package.json`, `pnpm-lock.yaml`                                                                                               | modified: task dependencies (exact versions)            |
| `apps/server/src/config.ts`                                                                                                                | added: env schema, production rules, `ConfigError`      |
| `apps/server/src/logger.ts`                                                                                                                | added: pino factory + redaction paths                   |
| `apps/server/src/app.ts`                                                                                                                   | added: `createApp`, `AppDeps`, `RouteModule` re-export  |
| `apps/server/src/main.ts`                                                                                                                  | modified: composition root, timeouts, graceful shutdown |
| `apps/server/src/shutdown.ts`                                                                                                              | added: `onShutdown` hooks, run-once, 10 s bound         |
| `apps/server/src/domain/shared/{clock,ids,ttl-cache,result}.ts`                                                                            | added                                                   |
| `apps/server/src/http/{respond,client-ip,rate-limit,route-module}.ts`                                                                      | added                                                   |
| `apps/server/src/http/middleware/{request-id,request-logger,security-headers,cors,allowed-origin,require-json,error-handler,not-found}.ts` | added                                                   |
| `apps/server/src/http/routes/health.routes.ts`                                                                                             | added                                                   |
| `apps/server/src/test-support/test-app.ts`                                                                                                 | added: probe routes + log capture for tests             |
| `*.test.ts` (config, app, shutdown, shared, client-ip, rate-limit)                                                                         | added                                                   |

## Acceptance criteria

| #    | Criterion                                  | Status | Evidence                                                                                                                                                                                                                                        |
| ---- | ------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Config dev defaults, prod rules            | pass   | `config.test.ts`: "loads with defaults from an empty environment", production describe (fakes, each required secret via `it.each`, non-https, no values in message)                                                                             |
| AC-2 | CORS preflight / foreign / POST 403        | pass   | `app.test.ts` "CORS" block; manual `curl -X OPTIONS` returned 204 with `Access-Control-Allow-Origin: http://localhost:4321`, `Max-Age: 600`, no Allow-Credentials; foreign-origin POST returned 403                                             |
| AC-3 | `resolveClientIp` matrix, separate buckets | pass   | `client-ip.test.ts`; `rate-limit.test.ts` "separate buckets in x-real-ip mode", "/56 prefix", "ignores X-Real-IP in socket mode"                                                                                                                |
| AC-4 | Envelopes, request id, headers, HSTS       | pass   | `app.test.ts` "error envelopes", "request id", "security headers" (HSTS only with `isProduction: true`)                                                                                                                                         |
| AC-5 | Limiter 429 + headers; global cap          | pass   | `rate-limit.test.ts` "returns 429 ... Retry-After and draft-8 RateLimit headers"; `createGlobalCap` tests (both windows, rejected attempts not counted)                                                                                         |
| AC-6 | Logs contain no bodies/IPs/cookies/auth    | pass   | `app.test.ts` "never logs bodies, IPs, cookies or authorization" (also query string, 500 path, invalid-JSON path)                                                                                                                               |
| AC-7 | Health 200/503; shutdown once              | pass   | Health: `app.test.ts` "health". Hooks once/reverse/deadline: `shutdown.test.ts`. Signals: `signals.test.ts` (EventEmitter fake: SIGTERM and SIGINT run shutdown once and exit 0; second signal ignored; exit 1 on deadline and on rejected run) |

## Validation output

```
$ pnpm verify
prettier: All matched files use Prettier code style!
eslint: clean; tsc: 0 errors (server, web, contracts)
apps/server test: Test Files 6 passed (6), Tests 67 passed (67)
build: astro build Complete! (exit 0)

$ PORT=3011 node src/main.ts   (then curl)
GET /api/health                 -> 200 {"data":{"status":"ok","db":"ok"}}, CSP default-src 'none';frame-ancestors 'none', X-Frame-Options DENY, no X-Powered-By, no HSTS
OPTIONS (Origin localhost:4321) -> 204, ACAO echoed, Max-Age 600, Expose-Headers X-Request-Id,Retry-After,RateLimit,RateLimit-Policy
POST    (Origin evil.example)   -> 403
PORT=abc node src/main.ts            -> "Invalid configuration. Check these variables: PORT", exit 1
NODE_ENV=production node src/main.ts -> lists variable names only, exit 1
```

The server on 3011 was stopped by PID; the port was confirmed free (only TIME_WAIT sockets remained).

Coverage (`pnpm --filter @portfolio/server exec vitest run --coverage`, thresholds 80/75 overall and 90/85 for `src/domain/**` enforced in `vitest.config.ts`, passed): Statements 87.12%, Branches 85.5%, Functions 87.2%, Lines 87.05% (7 files, 72 tests). `main.ts` is 0% (composition root, only smoke-run manually) and `logger.ts` is 50% (pretty-transport branch). After the signal change `pnpm verify` is still exit 0.

## Tests added

- `config.test.ts` (17): defaults, empty-string handling, PORT validation, origin parsing, provider credentials, E.164 phone, every production rule, value-free messages.
- `app.test.ts` (20): CORS, error envelopes, request ids, security headers, health, log capture.
- `rate-limit.test.ts`, `client-ip.test.ts`, `shutdown.test.ts`, `domain/shared/shared.test.ts`.

## Assumptions (low-impact decisions taken)

- Empty-string env values count as unset (matches `.env.example`, e.g. `PORT=`, `OPENAI_API_KEY=`).
- Real providers need their credentials in every environment, not only production (e.g. `MAILER=resend` requires `RESEND_API_KEY`, `MAIL_FROM`, `CONTACT_RECIPIENT_EMAIL`).
- `CONTACT_PHONE` is optional outside production, validated as E.164 when set.
- The allowed-origin check runs before body parsing (global middleware, POST only) rather than after `jsonBody`, so foreign origins never get their payload parsed. `jsonBody(limit)` returns `[requireJson, express.json]`, so 415 precedes parsing too.
- `/api/health` failure uses the `INTERNAL` envelope with `Retry-After: 5`, per `docs/api.md`.
- Client-supplied request ids are kept only if they match `[A-Za-z0-9._-]{8,64}`.
- `Cache-Control: no-store` is set globally in the security-headers step; routes can override.
- The `ApiErrorCode` union in `http/respond.ts` is server-local (T-010 owns the contracts); swap to the contracts import once merged.
- `main.ts` wires `checkDatabase: () => undefined` as a placeholder until T-012 provides the DB.
- Extra redaction wildcards (`*.body`, `*.email`, `*.name`) added beyond the listed paths; the request serializer is an allow-list anyway.
- `pino-pretty` is used only when `NODE_ENV=development`.

## Deviations from spec or design

- Pipeline order: allowed-origin before body parsing (see assumptions). The effect is stricter, not looser.

## Change Requests (shared surfaces / dependencies)

- None. `@vitest/coverage-v8@5.0.5` added as a devDependency (approved in architecture section 10).

## Open issues and follow-ups

- `createClientLimiter` takes a `clientIpSource` option in addition to `{ windowMs, limit }` because it has no other access to the config.
