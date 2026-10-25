# T-017: Guestbook admin CLI (takedown path)

|                          |               |
| ------------------------ | ------------- |
| **Wave**                 | 5             |
| **Depends on**           | T-014         |
| **Blocked by decisions** | none          |
| **Parallel with**        | T-029…T-033   |
| **Size**                 | S             |
| **Requirements**         | FR-48, NFR-11 |

## Objective

Give the owner a safe command-line way to list, delete, and purge guestbook messages on the running system, as the remedy when automated moderation misses something.

## References

- `docs/guestbook-moderation.md` §9
- `docs/security.md` §8 (deletion on request)

## Scope

- `src/cli/guestbook-admin.ts`: commands `list [--status approved|pending] [--limit N]`, `export [--format json|csv] [--out file]` (the private archive, D-17: approved rows, newest first, fields publicId, body, paint, locale, approvedAt), `delete <publicId> [--yes]`, `purge-pending [--yes]`. Uses `loadConfig` for `DATABASE_PATH` and opens the existing DB. It **never** runs migrations or creates a database: if the file or `schema_migrations` is missing, it exits with an error. Arguments via `node:util` `parseArgs`. Destructive actions confirm interactively unless `--yes`. Exit codes: 0 success, 1 usage error, 2 not found. Production usage on Railway (`railway ssh` / `railway run`) is documented in T-050.
- `apps/server/package.json` script: `"guestbook": "node --env-file-if-exists=../../.env src/cli/guestbook-admin.ts"`.
- Document usage in `README.md` (operations section; allowed edit).

## Allowed files

`apps/server/src/cli/**` (+ tests), `apps/server/package.json` (script), `README.md` (CLI usage subsection only).

## Acceptance criteria

- **AC-1** Each command works against a temp DB, verified by tests that run the CLI function with injected argv and stdio.
- **AC-2** `delete` of an unknown ID → exit 2 with a clear message. Without `--yes`, a non-interactive stdin aborts safely.
- **AC-3** It runs concurrently with a server holding the same DB file (WAL); covered by a test using two connections.
- **AC-4** It refuses to run against a path without an initialized schema.

## Validation

```
pnpm verify
pnpm --filter @portfolio/server guestbook list
```

## Definition of done

Standard DoD.
