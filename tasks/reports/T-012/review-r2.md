# T-012 review, round 2

- **Reviewer:** orchestrator (Opus), re-review of round 1 findings only
- **Verdict:** APPROVED

| Finding                                 | Status                                                                                                                                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01 BLOCKER `ERR_PNPM_IGNORED_BUILDS` | Fixed on main (badcf03: `allowBuilds: better-sqlite3: false`; the package ships prebuilt binaries for every target). Clean `pnpm install --frozen-lockfile` exits 0.                                                                                                |
| R1-02 MINOR UNIQUE→`duplicate` untested | Fixed: `maps a publicId collision to duplicate and rolls the supersede back`. The pre-check keys on `clientRequestId`/`contentHash`, so a `publicId` collision can only come from the INSERT; the test proves the mapping and the rollback of the supersede delete. |
| R1-03 MINOR shared test helper          | Fixed: `infra/db/test-db.ts` exports `createTestDb()`.                                                                                                                                                                                                              |
| R1-04 NIT port type                     | Fixed: `NewPendingMessage`.                                                                                                                                                                                                                                         |

Gate C: `pnpm verify` on the squash-merged tree (see the merge commit).
