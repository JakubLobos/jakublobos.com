# T-014: Guestbook service, review pipeline, newest-wins worker, and API routes

|                          |                                    |
| ------------------------ | ---------------------------------- |
| **Wave**                 | 4                                  |
| **Depends on**           | T-012, T-013                       |
| **Blocked by decisions** | none                               |
| **Parallel with**        | frontend wave-4 tasks, T-040       |
| **Size**                 | L                                  |
| **Requirements**         | FR-40…FR-46, NFR-05…NFR-07, NFR-12 |

## Objective

Implement the guestbook backend end to end:

- submission orchestration with all rules and caps
- the three-layer review pipeline
- the **newest-wins** worker that only ever reviews or retries the single newest pending message
- the two HTTP endpoints

Every invariant in `guestbook-moderation.md` §1 must be proven with tests.

## References

- `docs/guestbook-moderation.md` (entire; §4–§6 are normative)
- `docs/api.md` §3, §4
- `docs/testing.md` §2, §3 (the guestbook list is the minimum test set)
- `docs/security.md` T1, T5–T8

## Scope

- `domain/guestbook/normalize.ts`: `dedupeKey` (NFKC, lowercase, whitespace collapse, strip trailing punctuation) and `contentHash` via an injected `Hasher` port (`node:crypto` SHA-256 in infra).
- `domain/guestbook/backoff.ts`: `nextAttemptDelay(attempts, retryAfterSeconds?)`.
- `domain/guestbook/review-pipeline.ts`: `reviewMessage({ body, locale })` → `approve | reject(layer, reason) | transient(code, retryAfter?)`. Moderation first; suitability only if moderation passes; a single code path returns `approve`.
- `domain/guestbook/review-worker.ts`: `createReviewWorker({ repo, pipeline, clock, scheduler, logger, recentRejections })` with `start()`, `stop()`, `nudge()`, and `tick()`. Non-reentrant with a **rerun flag**; tick = expire → `findDuePending` (≤ 1) → pipeline → approve / delete+remember / recordFailure. Logged events: `approved`, `rejected` (layer, reason), `superseded` (count, from insert), `expired`, `retry_scheduled`. Never logs text.
- `domain/guestbook/guestbook.service.ts`:
  - `submit(input, ctx)` → `{ kind: 'accepted' } | { kind: 'invalid', fields } | { kind: 'busy', retryAfterSeconds }`, in the processing order of `api.md` §3: feedback rules → honeypot → global caps (20/h, 50/day via `createGlobalCap`) → quality rules → blocked terms → recent rejections → `insertPendingNewestWins` → `worker.nudge()`
  - `latest()`
- `http/routes/guestbook.routes.ts`:
  - `GET /api/guestbook/latest`: per-client 60/min; `Cache-Control: no-cache`; ETag
  - `POST /api/guestbook`: `jsonBody('8kb')`, require-json, allowed-origin, per-client 3/10 min + 10/24 h, schema, service; maps to 202 / 422 / 503 (`Retry-After`)
- Wiring in `main.ts`: providers (T-013), pipeline, worker (start after listen; stop on shutdown), service, route module.
- `test/helpers/build-test-app.ts`: in-memory DB, fakes, `FakeClock`, a manual scheduler. Reusable by other tasks.

## Out of scope

Admin CLI (T-017), frontend (T-029).

## Allowed files

`apps/server/src/domain/guestbook/{normalize,backoff,review-pipeline,review-worker,guestbook.service}.ts` (+ tests), `apps/server/src/infra/crypto/**`, `apps/server/src/http/routes/guestbook.routes.ts` (+ tests), `apps/server/src/main.ts` (wiring), `apps/server/test/helpers/**`.

## Acceptance criteria

- **AC-1** All guestbook cases in `docs/testing.md` §3 pass (validation, review outcomes, retention and archive, newest-wins and concurrency, abuse controls).
- **AC-2** Invariants I-1…I-8 each have a named test (`it('I-7: …')`).
- **AC-3** **Newest wins under outage:** with the moderation fake transient, submitting 5 messages over time leaves exactly 1 pending row (the last). After recovery, only that message is reviewed (provider spy: calls only with the last text), and it gets published.
- **AC-4** **Supersede during in-flight review:** A's review is pending; B is inserted → the A approval is a no-op; B is reviewed in the immediately following tick (no 15 s wait).
- **AC-5** The suitability reviewer is never called when moderation rejects or is transient. The pipeline is never called for silent-rule drops.
- **AC-6** Response bodies for accepted, duplicate, honeypot, quality-drop, and blocked-term submissions are byte-identical.
- **AC-7** `GET /latest` returns `null`, then the newest approved; 304 with `If-None-Match`; never a pending row.
- **AC-8** Manual check: `pnpm dev` + curl submission with fakes → `/latest` shows it within 1 s.

## Validation

```
pnpm verify
pnpm --filter @portfolio/server test:coverage     # domain/** ≥ 90/85
```

## Definition of done

Standard DoD.
