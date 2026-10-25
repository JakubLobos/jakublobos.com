# T-014: Implementation report, round 2

- **Branch:** `task/T-014-guestbook-api` (merged `main`)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

Tests only; no production code changed.

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: the AC-4 test in `review-worker.test.ts` now drains microtasks (`for … await flush()`) instead of calling `worker.tick()`. Mutation check: with `nudge()` changed to `if (!stopped && running === null) void tick();` the AC-4 test fails (`expected null to be 'Really clean layout here'`); restored, both affected files pass. |
| R1-02   | fixed: renamed to `I-2 / AC-7: returns null, then the newest approved message, and never a pending one` in `guestbook.routes.test.ts`.                                                                                                                                                                                                   |
| R1-03   | fixed: listed under Deviations below.                                                                                                                                                                                                                                                                                                    |

## Deviations from spec or design

- A provider `Retry-After` is capped at 2 h (`backoff.ts`), whereas `guestbook-moderation.md` §5 says it is respected (`max`). Reason: a bogus header must not park the only pending row until it expires. The orchestrator is updating §5 and `api.md` on main.
