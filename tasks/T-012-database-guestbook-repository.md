# T-012: SQLite database, migrations, and guestbook repository (newest-wins)

|                          |                                                          |
| ------------------------ | -------------------------------------------------------- |
| **Wave**                 | 3                                                        |
| **Depends on**           | T-010, T-011                                             |
| **Blocked by decisions** | none                                                     |
| **Parallel with**        | T-013, T-015, T-016, T-021, T-022                        |
| **Size**                 | M                                                        |
| **Requirements**         | FR-43, FR-44, FR-46, FR-48 (data access), NFR-06, NFR-07 |

## Objective

Persist guestbook messages with database-level guarantees: retention ≤ 100 rows, **at most one pending row** (newest wins), idempotency, and an atomic supersede-evict-insert. Everything sits behind a repository port.

## References

- `docs/guestbook-moderation.md` §1 (I-3, I-5, I-7, I-8), §3 (schema: copy exactly), §4 (transaction steps), §8 (archive)
- `docs/decisions/0004-sqlite-better-sqlite3.md`, `0006-guestbook-state-model-and-retention.md`
- `docs/testing.md` §2, §3

## Scope

- `src/infra/db/connection.ts`: open with pragmas; parent dir creation; `:memory:` support.
- `src/infra/db/migrate.ts` + `migrations/0001_guestbook.sql` (exact schema, including the partial unique index `ux_guestbook_single_pending` and the retention trigger).
- `src/domain/guestbook/repository.port.ts`: `GuestbookRepository` + domain row types.
- `src/infra/db/guestbook.repository.ts`:
  - `insertPendingNewestWins({ publicId, clientRequestId, body, paint, locale, contentHash, now })` → `{ kind: 'inserted', supersededCount } | { kind: 'duplicate' }`. One IMMEDIATE transaction, steps 1–5 of §4. UNIQUE violations map to `'duplicate'`.
  - `findLatestApproved()`, `findDuePending(now)` (≤ 1 row), `approve(id, now)` (from pending only; boolean)
  - `deletePending(id)`, `recordFailure(id, code, nextAttemptAt)`, `deleteExpiredPending(createdBefore)`
  - CLI: `listArchive({ status?, limit })`, `exportArchive()` (approved, newest first), `deleteByPublicId(publicId)`, `purgePending()`
  - `ping()`
- Wiring in `main.ts`: open, migrate, `checkDatabase = repo.ping`, close on shutdown.

## Out of scope

Review pipeline, worker, routes (T-013/T-014); CLI parsing (T-017).

## Allowed files

`apps/server/src/infra/db/**`, `apps/server/src/domain/guestbook/repository.port.ts`, `apps/server/src/main.ts` (wiring), `apps/server/package.json`, `pnpm-lock.yaml`.

## Dependencies (exact)

`better-sqlite3@13.0.3`; dev `@types/better-sqlite3@9.6.0` (report any mismatch with v13; don't cast around it).

## Implementation notes

- Prepared statements only; timestamps come from the caller's `now`.
- The constants `GUESTBOOK_RETENTION_LIMIT` and `GUESTBOOK_MAX_PENDING` come from contracts; a test asserts that the SQL trigger value (100) and the partial index agree with them.

## Acceptance criteria

- **AC-1** Schema, indexes, and trigger exist exactly as specified (`sqlite_master` test).
- **AC-2** Migrations are idempotent.
- **AC-3** Newest wins: insert A then B → A deleted (`supersededCount: 1`), B pending. A direct SQL insert of a second pending row fails (partial unique index).
- **AC-4** 150 insert+approve cycles → exactly 100 rows, the newest retained, the oldest approved evicted first. A pending row is never evicted by step 4.
- **AC-5** Duplicate `clientRequestId` or `contentHash` → `'duplicate'`; nothing deleted or inserted (the supersede step doesn't run for duplicates).
- **AC-6** The trigger blocks a 101st row. `approve` on a deleted or approved row → false.
- **AC-7** WAL: a second connection (CLI) can read, export, and delete while the first is open.
- **AC-8** `exportArchive()` returns only approved rows, newest first, with `publicId`, `body`, `paint`, `locale`, `approvedAt`.

## Validation

```
pnpm verify
pnpm --filter @portfolio/server test -- src/infra/db
```

## Definition of done

Standard DoD.
