# T-014: Review, round 1

- **Reviewed:** `task/T-014-guestbook-api` @ `e7c81f1` against `main` @ `6c70ba1` (merge base `deb21b6`; merges cleanly)
- **Reviewer / model:** claude-opus-5-5
- **Verdict:** CHANGES_REQUESTED

## Gate results (re-run by reviewer)

| Command                                                       | Result                                                                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                              | ✅                                                                                                                                                                             |
| `pnpm verify` (branch)                                        | ✅ exit 0: contracts 153, server 28 files / 314 tests, web 71, build OK                                                                                                        |
| `pnpm verify` (branch merged with `main` @ 5633eb0)           | ✅ exit 0 (server 314, web 98) once Astro types exist. The fresh-checkout lint failure in `apps/web/src/lib/api/client.ts` came from main and is fixed there already (26713e9) |
| `pnpm --filter @portfolio/server test:coverage` (merged tree) | ✅ all files 92.96 / 90.49; `domain/guestbook` 95.96 stmts / 90.43 branches; `src/domain/**` thresholds (90/85) enforced and met                                               |

## Scope check

Files outside _Allowed files_: none (three-dot diff: the domain files listed, `infra/crypto/sha256.hasher.ts`, `guestbook.routes.ts`, `main.ts`, `test/helpers/build-test-app.ts`, tests, the report). Unlisted dependencies: none.

## Acceptance criteria (independently verified)

| #    | Status | Evidence gathered by reviewer                                                                                                                                                                                                                                                                                                                                                    |
| ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | ✅     | Read all six test files against `testing.md` §3. The T-014 cases are present: validation shapes, 413/415, outcomes, expiry, newest-wins, I-5 duplicates, per-client 429, 21st/51st → busy, XSS verbatim, log capture. Repository, provider and quality-rule cases are in the T-012/T-013 suites                                                                                  |
| AC-2 | ❌     | I-1, I-3…I-8 have named tests. **I-2 has none**: it is covered only by the test named `AC-7: …` (R1-02)                                                                                                                                                                                                                                                                          |
| AC-3 | ✅     | `review-worker.test.ts` AC-3: 5 submissions under a transient fake leave one pending row (the last). After recovery the moderation spy delta is `[TEXTS[4]]`, suitability is `[TEXTS[4]]`, and that text is published                                                                                                                                                            |
| AC-4 | ⚠️     | The code is correct: the rerun flag is set by `nudge()` → `tick()` while a pass is running, `approve(A)` returns false, and `stale_result` is logged. The **test does not prove it** (R1-01)                                                                                                                                                                                     |
| AC-5 | ✅     | Pipeline test: suitability spy is not called on flagged or transient moderation. Service test: honeypot, quality and blocked-term drops make no provider call and store no row                                                                                                                                                                                                   |
| AC-6 | ✅     | Routes test compares `res.text` across 6 cases, all equal to `{"data":{"status":"received"}}`                                                                                                                                                                                                                                                                                    |
| AC-7 | ✅     | `null` → pending stays hidden → approved shown → a newer pending row does not displace it; 304 on `If-None-Match`; `Cache-Control: no-cache`                                                                                                                                                                                                                                     |
| AC-8 | ✅     | Ran `node src/main.ts` (fakes, temp DB, :3107). `/latest` returned `null`; POST → 202; `/latest` returned the message 1 s later (the `approved` log line has the POST's timestamp). An `[unsuitable]` note → 202 and `rejected` (suitability, `off_topic_or_weird`), and `/latest` was unchanged. Grep of the log for the text and the IP: 0 hits. Process killed and port freed |

### Orchestrator focus items

- **I-1 (explicit pass):** single `approve` return at `review-pipeline.ts:76`. It is reached only after the local rules are null, `decideModeration` returns `approve` (a binary union), and `verdict === 'approve'`. Transient never approves. ✅
- **Newest wins / stale row:** every repository write after the review is keyed on `row.id` with `AND status='pending'` (AUTOINCREMENT ids). A false `approve` or `deletePending` logs `stale_result`. A stale `recordFailure` is a no-op. ✅
- **Transient → backoff → expiry:** `nextAttemptDelay(row.attempts, retryAfter)`; `deleteExpiredPending` runs before `findDuePending`. Tested, including the "never called early" check. ✅
- **Lifecycle:** `running` guard plus the `rerun` loop. `running = null` is set in `finally`, synchronously after the last `shouldRerun()`, so no nudge is lost. `stop()` sets `stopped`, cancels the interval and awaits the whole loop. `start()` is idempotent and refused after stop. `nudge()` is ignored after stop. In `main.ts` the hooks run in reverse order: server close → `worker.stop()` → `db.close()`. ✅
- **Body validation** goes only through `checkGuestbookBody` (service and pipeline). Logs carry only event, reason, layer, counts and codes. ✅

### Declared decisions

| Decision                                      | Judgement                                                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline re-runs local rules before providers | Accept. Free, and it strengthens I-1 ("rules … all explicitly pass") for rows stored before a rule change                                                                                         |
| `Retry-After` capped at 2 h                   | Accept. A bogus header must not park the only pending row until it expires. This deviates from the wording of `guestbook-moderation.md` §5 ("respected (`max`)") and should be documented (R1-03) |
| `stale_result` event                          | Accept. Contains no text                                                                                                                                                                          |
| `locale` defaults to `en`                     | Accept. This is what `api.md` §3 says                                                                                                                                                             |
| `submit(input, ctx = { log })`                | Accept. Request-scoped correlation; the domain sees only a structural logger                                                                                                                      |
| `worker.start()` after `listen`               | Accept. This is what the task says                                                                                                                                                                |
| `test-kit.ts` left in place                   | Accept. It belongs to T-013 and is outside this task's files                                                                                                                                      |
| `test/helpers/build-test-app.ts`              | Accept. Required by the task and reused by four suites                                                                                                                                            |

### `fields.*: required` vs `api.md` (implementer note)

**Fix the doc, not the code.** The mapping matches `contact.routes.ts` and the contracts' `FieldErrorCode`. `api.md` §3 should list `required` for a missing `body` / `paint` / `clientRequestId`, and `invalid` for a non-string `body`. Orchestrator follow-up, not a finding against this task.

## Checklist

Requirements & design ✅ · Correctness ✅ · Architecture ✅ · Type safety ✅ · Security & privacy ✅ · Accessibility N/A · Responsive & performance N/A · Tests ❌ (R1-01, R1-02) · Process ✅

## Findings

| ID    | Severity | Location                                                    | Problem                                                                                                                                                                                                                                                                                                                                                    | Why (ref)                                                                                                                                                 | Expected fix                                                                                                                                                                                                                                 |
| ----- | -------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01 | MAJOR    | `apps/server/src/domain/guestbook/review-worker.test.ts:69` | The AC-4 test calls `await app.worker.tick()` after `release()`. That call sets `rerun` itself, so the test passes even when a nudge arriving during an in-flight review is dropped. Verified by mutation: with `nudge()` changed to `if (!stopped && running === null) void tick();` the AC-4 test still passes (only the unrelated `stop()` test fails). | AC-4 ("B is reviewed in the immediately following tick"), `testing.md` §3 newest-wins ("rerun flag"), checklist "tests would fail if the behaviour broke" | Replace the `tick()` call with draining microtasks only, e.g. `for (let i = 0; i < 5; i += 1) await flush();`. Verified: this passes on the current code and fails on the mutation above (`expected null to be 'Really clean layout here'`). |
| R1-02 | MINOR    | `apps/server/src/http/routes/guestbook.routes.test.ts:109`  | No test is named for I-2. AC-2 requires a named test for each invariant.                                                                                                                                                                                                                                                                                   | AC-2, `guestbook-moderation.md` §1                                                                                                                        | Rename the test, e.g. `'I-2 / AC-7: returns null, then the newest approved message, and never a pending one'`.                                                                                                                               |
| R1-03 | NIT      | `apps/server/src/domain/guestbook/backoff.ts:23`            | The 2 h `Retry-After` cap is a behaviour change from §5, but the report lists "Deviations: none".                                                                                                                                                                                                                                                          | `guestbook-moderation.md` §5; AGENTS rule 12                                                                                                              | Move it to Deviations in the round-2 report; the orchestrator updates §5 ("respected (`max`), capped at 2 h").                                                                                                                               |

## Notes for orchestrator

- Fix the `api.md` §3 doc for `required` (see above).
- `testing.md` §3 asks for 150 retention cycles. T-012's repository test has 150, and T-014's service test uses 120 through the full worker. Both are enough; no new test needed.
- After R1-01/R1-02 the round-2 review only needs to rerun the two affected test files and `pnpm verify`.
