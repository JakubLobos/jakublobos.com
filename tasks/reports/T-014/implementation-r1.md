# T-014: Implementation report, round 1

- **Branch:** `task/T-014-guestbook-api` (fast-forwarded to `main` @ dc49496 before starting; commit SHA in the git log)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Guestbook backend end to end: `normalize` (dedupe key and hash via a `Hasher` port), `backoff`, a three-layer `review-pipeline` (single `approve` call site), the non-reentrant `review-worker` with rerun flag, `guestbook.service`, the two routes, `main.ts` wiring (worker starts after `listen`, stops before the DB closes) and a reusable `buildGuestbookTestApp` helper. Body validation goes only through `checkGuestbookBody`. `domain/` imports nothing from Express, SQLite, `fetch` or `process.env`.

## Files changed

| File                                                                                                          | Change                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/domain/guestbook/normalize.ts`                                                               | added: `dedupeKey`, `contentHash`, `Hasher` port                                                                             |
| `apps/server/src/infra/crypto/sha256.hasher.ts`                                                               | added: `node:crypto` SHA-256 hasher                                                                                          |
| `apps/server/src/domain/guestbook/backoff.ts`                                                                 | added: `nextAttemptDelay`                                                                                                    |
| `apps/server/src/domain/guestbook/review-pipeline.ts`                                                         | added: `createReviewPipeline` / `reviewMessage`                                                                              |
| `apps/server/src/domain/guestbook/review-worker.ts`                                                           | added: worker, `Scheduler` port + `intervalScheduler`, `RecentRejections` (1 h `TtlCache`), `GuestbookLogger`                |
| `apps/server/src/domain/guestbook/guestbook.service.ts`                                                       | added: `submit`, `latest`                                                                                                    |
| `apps/server/src/http/routes/guestbook.routes.ts`                                                             | added: routes, limiters, `createGuestbookCap` (20/h, 50/day)                                                                 |
| `apps/server/src/main.ts`                                                                                     | modified: guestbook wiring block, `worker.start()` in the listen callback, `worker.stop()` hook registered after the DB hook |
| `apps/server/test/helpers/build-test-app.ts`                                                                  | added: in-memory DB, stub providers, `FakeClock`, manual scheduler, `submit`/`post`/`latest`                                 |
| `*.test.ts` next to the above (normalize, backoff, review-pipeline, review-worker, guestbook.service, routes) | added                                                                                                                        |

## Acceptance criteria

| #    | Criterion (short)                    | Status | Evidence                                                                                                                                                                                               |
| ---- | ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | `testing.md` §3 guestbook cases pass | yes    | Validation, outcomes, retention, newest-wins and abuse cases are in the files below. Repository/provider/quality-rule cases already live in the T-012/T-013 suites                                     |
| AC-2 | I-1…I-8 named tests                  | yes    | `I-1` (pipeline, worker), `I-3`, `I-5`, `I-7`, `I-8` (`guestbook.service.test.ts`), `I-4`, `I-6` (`review-worker.test.ts`); I-2 is `AC-7` in `guestbook.routes.test.ts`                                |
| AC-3 | Newest wins under outage             | yes    | `AC-3: newest wins under an outage…` in `review-worker.test.ts` (5 submissions, 1 pending; after recovery provider calls are only the last text; published)                                            |
| AC-4 | Supersede during in-flight review    | yes    | `AC-4: …` in `review-worker.test.ts` (A approval is a no-op, B reviewed in the same `tick()` with no clock advance, max concurrent pipeline calls 1). Mutation check below                             |
| AC-5 | Suitability/pipeline not over-called | yes    | `AC-5` in `review-pipeline.test.ts` and `guestbook.service.test.ts` (silent drops: no provider call, no row)                                                                                           |
| AC-6 | Byte-identical 202 bodies            | yes    | `AC-6: …` in `guestbook.routes.test.ts` (accepted, duplicate id, duplicate text, honeypot, quality drop, blocked term)                                                                                 |
| AC-7 | `/latest` null, newest, 304          | yes    | `AC-7: …` and `revalidates with ETag…` in `guestbook.routes.test.ts`; pending rows never returned                                                                                                      |
| AC-8 | Manual `curl` check                  | yes    | Built server with fake providers: `/latest` null, POST 202, `/latest` returned the message within 1 s; an `[unsuitable]` note was rejected. Logs held `approved`/`rejected` events and no message text |

## Validation output

```
$ pnpm verify
format:check OK · eslint OK · typecheck OK (all 3 workspaces)
packages/contracts: 153 tests · apps/server: 28 files, 314 tests · apps/web: 71 tests · build OK
exit 0

$ pnpm --filter @portfolio/server exec vitest run --coverage
Tests 314 passed (314)   All files 92.96 stmts / 90.49 branches
domain/guestbook         95.96 / 90.43     (thresholds: domain/** 90/85, met)
```

Mutation check: removing the `rerun = true` line in `tick()` makes the AC-4 and `stop()` tests fail; the line was restored.

## Tests added

- `normalize.test.ts`: NFC/NFD equivalence, case/whitespace/trailing punctuation/full-width folding, SHA-256 vector.
- `backoff.test.ts`: schedule, Retry-After max, invalid hints, cap at 2 h.
- `review-pipeline.test.ts`: approve only when everything passes; flagged, 0.2 vs 0.1999, suitability reject, transient (incl. `incomplete`); local rule re-check; suitability never called after moderation reject/transient.
- `review-worker.test.ts`: I-1, AC-3, AC-4, backoff and early-call guard, I-6 expiry, I-4 reject + recent-rejection memory, startup/interval recovery, `stop()`.
- `guestbook.service.test.ts`: accepted storage, 422 fields, AC-5 silent drops, I-3 (120 cycles), I-5, I-7 (25 submissions), I-8, global caps 20/h and 50/day.
- `guestbook.routes.test.ts`: AC-6, 422 shapes, 413/415, per-client 429 + Retry-After, 503 `GUESTBOOK_BUSY` + Retry-After, no PII in logs, AC-7, ETag/304, XSS payload verbatim, 60/min read limit.

## Assumptions (low-impact decisions taken)

- The pipeline repeats `checkGuestbookBody`, quality rules and blocked terms before calling providers (`layer: 'rules'`), so I-1 holds even for a row stored before the rules changed.
- A provider `Retry-After` is capped at 2 h (the longest backoff step) so a bogus header cannot park the newest message until it expires.
- `locale` defaults to `en` when omitted (as `api.md` says).
- `submit(input, ctx)`: `ctx` is `{ log }`, the request-scoped logger, so drops correlate by request id.
- The worker logs an extra `stale_result` event when `approve`/`deletePending` returns false (superseded or expired during review).
- Rejected texts are remembered even if the row was already superseded: the text itself failed review.
- `RecentRejections` is bounded at 500 entries / 1 h.
- `intervalScheduler` (unref'd `setInterval`) lives in `review-worker.ts`, next to the `Scheduler` port, as `systemClock` does in `shared/`.
- `test-kit.ts` stays in `infra/review/`; my helper does not need it.

## Deviations from spec or design

- None.

## Change Requests (shared surfaces / dependencies)

- **CR-1:** `apps/server/package.json` has no `test:coverage` script, but the task's Validation section runs `pnpm --filter @portfolio/server test:coverage`. Proposed: `"test:coverage": "vitest run --coverage"`. I ran the equivalent `vitest run --coverage` directly (output above).

## Open issues and follow-ups

- `docs/api.md` lists `fields.paint` / `fields.clientRequestId` as `invalid`; a missing field yields `required` (same mapping as `contact.routes.ts`). Not a conflict, noted for the reviewer.
- Worker tests drive time with an injected `FakeClock` and a manual scheduler. No test uses real timers or network.
