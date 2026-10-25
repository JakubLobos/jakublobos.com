# ADR-0004: SQLite via better-sqlite3

- **Status:** Accepted · **Date:** 2026-10-25 · **Related:** FR-44, FR-46, I-3…I-7

## Context

Data: at most 100 small guestbook rows. Requirements: atomic "check → evict → insert", UNIQUE constraints for idempotency, a trigger backstop, single instance, persistent volume, cheap.

## Decision

SQLite 3 (WAL mode) through **better-sqlite3 13.0.3**, with raw SQL in a repository module, numbered forward-only `.sql` migrations applied at startup, and no ORM.

Verified locally on 2026-10-25 (Windows, Node 24.20, pnpm 12.14): installs without build-script approval (ships prebuilt binaries), SQLite 3.53.4, and a prototype confirmed that the CHECK and UNIQUE constraints and the transactional retention pruning behave as designed.

## Alternatives considered

| Option                             | Why not                                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node:sqlite` (built-in)           | Still **Stability 1.2, Release candidate** in Node 24 docs; no transaction helper. Revisit when stable, since it would remove the native dependency. |
| PostgreSQL (managed)               | A separate service and cost for 100 rows; only needed for multi-instance                                                                             |
| Hosted libSQL/Turso, Cloudflare D1 | External dependency and network latency; tied to the serverless option the owner didn't choose                                                       |
| ORM (Drizzle/Prisma/Kysely)        | One table; raw SQL is clearer and has no extra dependency. The repository module gives the typed boundary.                                           |
| JSON file                          | No transactions or constraints; corruption risk                                                                                                      |

## Consequences

- Synchronous transactions mean no interleaving within the process, which makes the concurrency invariants simple to guarantee and test.
- The DB file needs a persistent volume and a backup procedure (`sqlite3 .backup` or the better-sqlite3 `backup()` API), documented in operations (T-050).
- The native module is pinned to Node major versions; check compatibility when upgrading Node.

## Sources

- Node 24 `node:sqlite` stability: https://nodejs.org/docs/latest-v24.x/api/sqlite.html (accessed 2026-10-25)
- better-sqlite3 13.0.3 on npm (engines `node >= 22`)
