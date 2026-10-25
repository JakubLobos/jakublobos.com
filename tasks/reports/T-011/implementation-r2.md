# T-011: Implementation report, round 2

- **Branch:** `task/T-011-server-foundation` (merged latest `main` first)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: `error-handler.ts` now maps any 4xx `status`/`statusCode` from body-parser/http-errors: 413 (or `entity.too.large`) to `PAYLOAD_TOO_LARGE`, 415 (unsupported charset / content encoding) to `UNSUPPORTED_MEDIA_TYPE`, other 4xx (malformed JSON, corrupt gzip) to `INVALID_JSON`. Client errors log at `warn` with only status and type (no stack); only non-4xx errors log at `error`. Tests in `app.test.ts`: `charset=latin1` (415, no level-50 log, no stack), `Content-Encoding: compress` (415), corrupt gzip (400). |
| R1-02   | fixed: removed `AppDeps.clientIpSource` and its use in `main.ts`. The single source is the `clientIpSource` option of `createClientLimiter`, which route factories take from `Config`. `buildTestApp` keeps `clientIpSource` only as a probe-route option, not an app dep.                                                                                                                                                                                                                                                        |
| R1-03   | fixed: added `ip`, `*.ip`, `req.ip`, `remoteAddress`, `*.remoteAddress`, `req.headers["x-forwarded-for"]`, and `*.headers.{authorization,cookie,x-real-ip,x-forwarded-for}` to `REDACT_PATHS`. New `logger.test.ts` logs an object for each path (17 cases) and asserts `[Redacted]` is present and the secret is absent.                                                                                                                                                                                                         |
| R1-04   | acknowledged as a deviation: `Clock.now()` returns epoch milliseconds (`number`), not `Date` as in `docs/testing.md` §2. Kept as requested; the orchestrator is updating the doc.                                                                                                                                                                                                                                                                                                                                                 |
| R1-05   | fixed: comment now says the validations only run inside the default `keyGenerator` and the setting is kept so swapping generators can't start warnings on Railway. Setting unchanged.                                                                                                                                                                                                                                                                                                                                             |
| R1-06   | fixed: new `http/server.ts` `createHttpServer(listener)` sets `headersTimeout` 15 s, `requestTimeout` 20 s, `keepAliveTimeout` 5 s and `connectionsCheckingInterval` 5 s; `main.ts` uses it. `http/server.test.ts` asserts all four values.                                                                                                                                                                                                                                                                                       |

Item 8 (swap `ApiErrorCode` for the contracts type): not done; T-010 had not landed when I finished. `ApiErrorCode` stays server-local.

## Validation output

```
$ pnpm verify
exit 0; apps/server: 9 test files, 93 tests passed; apps/web: 69 tests passed; typecheck 0 errors; build complete

$ pnpm --filter @portfolio/server exec vitest run --coverage
Test Files 9 passed (9), Tests 93 passed (93)
Statements ~88%, Branches 86.57% (129/149), Lines 88.11% (252/286)
(thresholds in vitest.config.ts: 80/75 overall, 90/85 for src/domain/** all met)
```

No server processes were started this round; nothing is listening on port 3011.

## Notes

- Zstd is supported by Node 24's zlib, so `Content-Encoding: zstd` with a non-zstd body is a corrupt body (400), not an unsupported encoding. The 415 test therefore uses `compress`, which body-parser does not implement.
- `connectionsCheckingInterval` is not in `@types/node`, so the test reads it through a narrow cast.

## Change Requests

- None.

## Open issues and follow-ups

- Swap `ApiErrorCode` for the contracts `ErrorCode` once T-010 is on main.
