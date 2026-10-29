# T-011: Review, round 2

- **Reviewed:** `task/T-011-server-foundation` @ `63d92e4` (fix commit on top of merge `504c103`) against `main` @ `7c1daf8`
- **Reviewer / model:** claude-opus-5-5
- **Verdict:** APPROVED

All round 1 findings are resolved. One new MINOR (R2-01) remains open. It doesn't block approval, but it should be fixed before route tasks start relying on the error handler.

## Gate results (re-run by reviewer)

| Command                                                      | Result                                                                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                             | PASS "Lockfile is up to date"                                                                                                                                                                     |
| `pnpm verify`                                                | PASS exit 0. `apps/server`: Test Files 9 passed (9), Tests 93 passed (93). `apps/web`: 69 passed. Typecheck 0 errors. Build complete.                                                             |
| `pnpm --filter @portfolio/server exec vitest run --coverage` | PASS thresholds met. Statements 88.14 %, Branches 86.57 %, Functions 87.35 %, Lines 88.11 %                                                                                                       |
| Manual runs on `PORT=3012`                                   | PASS Slow-loris against the real `main.ts`: `408 Request Timeout` after **19.3 s** (round 1: 29.2 s), then in-process `SIGTERM` → exit 0. Every process was stopped and port 3012 confirmed free. |

## Scope check

Files outside _Allowed files_: none. Round 2 touches only `apps/server/src/**` and the implementer's report. Unlisted dependencies: none (lockfile unchanged in round 2).

## Acceptance criteria (independently verified)

All AC-1…AC-7 evidence from round 1 still holds. The round 2 changes don't touch config, CORS, client IP, the limiter, health or shutdown logic; I re-checked those through the 93 passing tests and the in-process shutdown run. Changes relevant to AC-4 and AC-6:

| #    | Status | Evidence gathered by reviewer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-4 | PASS   | I re-ran the round 1 reproductions over raw `node:http` against the probe route (1 KB limit):<br>• `charset=latin1` → 415 `UNSUPPORTED_MEDIA_TYPE`<br>• `Content-Encoding: compress` → 415<br>• corrupt gzip → 400 `INVALID_JSON`<br>• corrupt zstd → 400<br>• valid gzip → 200<br>• valid zstd → 200<br>• a gzip body that inflates to 200 KB → 413 `PAYLOAD_TOO_LARGE`, so the limit applies to the inflated size<br>Every client error logs at level 40 with only `status` and `type`, with no `stack`, email or IP in the output. |
| AC-6 | PASS   | `logger.test.ts` writes each of 17 paths through `createLogger({ destination })` and asserts `[Redacted]` is present and the value is absent. I confirmed the new paths are in `REDACT_PATHS` (`ip`, `*.ip`, `req.ip`, `remoteAddress`, `*.remoteAddress`, `x-forwarded-for` at the top level and under `*.headers`, and `*.headers.{authorization,cookie,x-real-ip}`).                                                                                                                                                               |

**zstd → `compress` swap:** I accept it, and my round 1 claim was wrong. body-parser 2.4.0 decodes `zstd` (`lib/read.js:225`, via Node 24 zlib): a valid zstd body returned 200 and a corrupt one 400. So `zstd` isn't an unsupported encoding, and `compress` (not implemented by body-parser) is the right fixture for the 415 path.

## Checklist

**Requirements and design**

- PASS Every acceptance criterion met
- PASS Scope respected
- N/A UI

**Correctness**

- PASS Edge cases: the client-error mapping is fixed
- FAIL Errors handled explicitly (R2-01: the 4xx mapping is broader than body-parser errors)
- PASS No races

**Architecture and maintainability**

- PASS Layers unchanged
- PASS Dead `AppDeps` field removed
- PASS `createHttpServer` is a small, focused module
- PASS Comments accurate

**Type safety**

- PASS No `any`. `error as Record<string, unknown>` follows an object/null guard. The cast in `server.test.ts` is needed because `connectionsCheckingInterval` is missing from `@types/node` (justified in a comment).

**Security and privacy**

- PASS No sinks
- PASS IP-shaped redaction paths added and tested
- PASS No PII in logs (probe confirmed)

**Accessibility / Responsive:** N/A

**Tests**

- PASS New tests would fail on regression: removing a redact path fails `logger.test.ts`, reverting the error mapping fails the three new envelope tests, and dropping a timeout fails `server.test.ts`
- PASS Deterministic

**Process**

- PASS Allowed files only
- PASS Conventional commit with the task ID
- PASS The report addresses every round 1 finding honestly, including the zstd note and the not-yet-done `ApiErrorCode` swap

## Findings

| ID    | Severity | Location                                                       | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Why (ref)                                                                                                          | Expected fix                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-01 | MINOR    | `apps/server/src/http/middleware/error-handler.ts:10-16,23-38` | `clientErrorInfo` treats **any** thrown object with a 4xx `status` or `statusCode` as a client body error. I reproduced this with a route that throws `Object.assign(new Error('OpenAI auth failed'), { status: 401 })`, and another that throws an error with `statusCode: 429`. Both returned **400 `INVALID_JSON`**, were logged at `warn` level, and had no stack. Provider and SDK-style errors (OpenAI 401/429, Resend 4xx) that escape a route through a bug would therefore be reported to the client as malformed JSON and hidden from the error log. That is a real server fault disguised as a client error. | `api.md` §1.1 (`INVALID_JSON` = body isn't parseable; `INTERNAL` = unexpected); conventions "never swallow errors" | Limit the 4xx branch to errors produced by body-parser and http-errors. For example, require `expose === true` (http-errors sets it for 4xx; body-parser wraps zlib failures with `createError(400, …)`, so corrupt gzip still matches) **and/or** a `type` from body-parser's known set. Everything else should fall through to 500 `INTERNAL` at `error` level. Add a test where a route throws `{ status: 401 }` and expect a 500. |

## Previous findings status

| ID    | Status                                                                                                                                                                                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01 | **resolved.** Charset and encoding errors → 415, corrupt bodies → 400, oversize (including inflated) → 413. Warn level, no stack. Tests added. The breadth of the fix is narrowed in R2-01.                                                                                 |
| R1-02 | **resolved.** `AppDeps.clientIpSource` was removed from `app.ts` and `main.ts`. `buildTestApp` keeps it only as a probe-route option and documents that it isn't an app dependency. `createClientLimiter({ clientIpSource })` is the single source.                         |
| R1-03 | **resolved.** IP-shaped paths added and a direct redaction test exists (17 cases).                                                                                                                                                                                          |
| R1-04 | **resolved by doc change.** `main` @ `7c1daf8` updates `docs/testing.md` §2 to `now(): number` (epoch milliseconds), and the round 2 report records the deviation. The branch still carries the old wording until it's rebased on `7c1daf8` (Gate C).                       |
| R1-05 | **resolved.** The comment now states that the validations only run in the default `keyGenerator`, and the setting is kept as defence in depth.                                                                                                                              |
| R1-06 | **resolved.** `http/server.ts` `createHttpServer` sets `headersTimeout` 15 s, `requestTimeout` 20 s, `keepAliveTimeout` 5 s and `connectionsCheckingInterval` 5 s, with a unit test. The observed slow-loris cutoff dropped from 29.2 s to 19.3 s (≤ 15 s + one 5 s check). |

## Notes for orchestrator

- R2-01 is small (a guard plus one test). I recommend doing it in the T-014/T-015 prerequisites or as a quick follow-up commit before those tasks mount real routes. Approval doesn't depend on it.
- Gate C: rebase on `main` @ `7c1daf8` so the `testing.md` §2 and `architecture.md` §5.2 updates are present. The branch's `docs/architecture.md` still shows the old step-4 order.
- The `ApiErrorCode` → contracts swap is still pending until T-010 lands, as agreed.
