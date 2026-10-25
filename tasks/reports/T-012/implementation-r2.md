# T-012: Implementation report, round 2

- **Branch:** `task/T-012-db-repository`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed by the orchestrator on main (badcf03, `allowBuilds: better-sqlite3: false`); merged into the branch. `pnpm install --frozen-lockfile` re-run after the merge, see below.                                                                                                                     |
| R1-02   | fixed: test `maps a publicId collision to duplicate and rolls the supersede back` in `guestbook.repository.test.ts` (distinct request id and hash, `publicId` of an approved row returns `duplicate`; the pending row that the transaction had deleted is still there, so the rollback is proven). |
| R1-03   | fixed: `createTestDb()` exported from `apps/server/src/infra/db/test-db.ts` (`:memory:` + migrations) and used by the repository test; T-014 can reuse it.                                                                                                                                         |
| R1-04   | fixed: `insertNewestWins` now takes the port's `NewPendingMessage`.                                                                                                                                                                                                                                |

## Validation output

See the orchestrator reply (verify and install exit codes).
