# T-012: Implementation report, round 1

- **Branch:** `task/T-012-db-repository`
- **Status claimed:** READY_FOR_REVIEW (one CR recommended, see CR-1)
- **Agent / model:** claude-sonnet-5-5

## Summary

SQLite connection (WAL, pragmas, parent-dir creation, `:memory:`), a forward-only migration runner, `0001_guestbook.sql` copied from `guestbook-moderation.md` §3, the `GuestbookRepository` port, and its better-sqlite3 implementation. `insertPendingNewestWins` runs §4 steps 1-5 in one IMMEDIATE transaction. `main.ts` opens, migrates, wires `checkDatabase: guestbookRepo.ping`, and closes the DB on shutdown (after the HTTP server drains).

## Files changed

| File                                                     | Change                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/server/src/infra/db/connection.ts`                 | added: `openDatabase`, pragmas, mkdir                                |
| `apps/server/src/infra/db/migrate.ts`                    | added: `schema_migrations` runner, per-file transaction              |
| `apps/server/src/infra/db/migrations/0001_guestbook.sql` | added: exact §3 schema                                               |
| `apps/server/src/domain/guestbook/repository.port.ts`    | added: port + row types (timestamps are epoch ms)                    |
| `apps/server/src/infra/db/guestbook.repository.ts`       | added: implementation; rows parsed with zod                          |
| `apps/server/src/infra/db/guestbook.repository.test.ts`  | added: invariant tests                                               |
| `apps/server/src/main.ts`                                | modified: DB open/migrate/ping/close block                           |
| `apps/server/package.json`, `pnpm-lock.yaml`             | modified: `better-sqlite3@13.0.3`, dev `@types/better-sqlite3@9.6.0` |

## Acceptance criteria

All evidence is in `guestbook.repository.test.ts`.

| #    | Status | Evidence                                                                                                                                                                               |
| ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | yes    | `migrations > create the exact schema and are idempotent`: table, 2 indexes, trigger exist; trigger `>= 100` checked against `GUESTBOOK_RETENTION_LIMIT`; `GUESTBOOK_MAX_PENDING` is 1 |
| AC-2 | yes    | same test: second `migrate` returns `[]`, `schema_migrations` has 1 row                                                                                                                |
| AC-3 | yes    | `keeps only the newest pending row...`, `is backed by a partial unique index...`                                                                                                       |
| AC-4 | yes    | `retains at most 100 rows...` (150 cycles, kept = newest 100), `never evicts the pending row...`                                                                                       |
| AC-5 | yes    | `treats a repeated clientRequestId / contentHash as a duplicate...` (existing pending row untouched)                                                                                   |
| AC-6 | yes    | `blocked by the trigger when a 101st row...`, `approves only from pending`, `deletePending does not touch approved rows`                                                               |
| AC-7 | yes    | `file-backed database (WAL)`: a second connection exports and deletes while the first is open                                                                                          |
| AC-8 | yes    | `exports approved rows only, newest first` (key set, order, pending excluded)                                                                                                          |

## Validation output

```
$ pnpm verify    -> exit 0
contracts: 153 passed | server: 10 files, 109 passed | web: 69 passed | astro build: 2 pages, 0 errors
$ pnpm --filter @portfolio/server test -- src/infra/db    -> green
Smoke: `node src/main.ts` with DATABASE_PATH=/tmp/t012/sub/x.db -> dir + WAL files created,
GET /api/health -> {"data":{"status":"ok","db":"ok"}}; process killed by PID, port freed.
```

## Tests added

Invariants only, against `:memory:` (a temp file DB only for WAL and mkdir): migration schema and idempotency, single pending / supersededCount, duplicate no-op, retention 100 with oldest-first eviction, trigger, approve only from pending, retry-time visibility, expiry, archive order and shape, WAL second connection, ping.

## Assumptions

- Port timestamps are epoch ms (matches `Clock.now(): number`). The DB stores fixed-width ISO strings (lexicographic = chronological). T-017 formats ms for export.
- "Due" pending = `next_attempt_at IS NULL OR <= now`. `listArchive` orders by `COALESCE(approved_at, created_at) DESC, id DESC`.
- `recordFailure` increments `attempts` itself and only touches pending rows.
- `ping` is an arrow property so it can be passed unbound to the health route (lint `unbound-method`).
- Any UNIQUE violation inside the transaction maps to `duplicate` (includes a theoretical `public_id` collision).

## Deviations from spec or design

None. The schema is copied verbatim.

## Change Requests

- **CR-1 (ACCEPTED by the orchestrator and APPLIED in this round): rowid reuse.** `0001_guestbook.sql` now matches `guestbook-moderation.md` §3 (main 9dde179) with `AUTOINCREMENT`; regression test `never reuses ids, so a stale approve cannot publish a newer unreviewed row` added. Original finding follows. The spec schema declares `id INTEGER PRIMARY KEY` without `AUTOINCREMENT`, so SQLite reuses the highest rowid once that row is deleted. Reproduced: insert A (id 1), supersede with B, and B also gets id 1. A worker mid-review of A that then calls `approve(1)` approves B, which was never reviewed. The `WHERE status='pending'` guard cannot help because B is pending. The same race exists for CLI `delete`/`purge-pending` during an in-flight review. Proposed fix: `id INTEGER PRIMARY KEY AUTOINCREMENT` in `0001_guestbook.sql` and in `guestbook-moderation.md` §3 (docs are a shared surface, so not touched here). Nothing is deployed yet, so no new migration is needed. I kept the schema exact as instructed. If the CR is rejected, T-014 must approve with something stable (e.g. also check `publicId`), which would change the port. A regression test (`approve(staleId)` after a supersede returns false) should land with the fix.
- **pnpm build scripts: no CR needed.** `better-sqlite3@13.0.3` ships prebuilt binaries and has no install script. `pnpm --filter @portfolio/server add` printed `ERR_PNPM_IGNORED_BUILDS` and wrote a placeholder `allowBuilds: better-sqlite3: set this to true or false` into `pnpm-workspace.yaml`. I reverted that file. `pnpm install --frozen-lockfile` then exits 0 and the module loads (SQLite 3.53.4). I left `allowBuilds` alone; no decision is needed because `better-sqlite3@13` ships prebuilt binaries.

## Open issues and follow-ups

- CR-1 above.
