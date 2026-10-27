# T-017: Implementation report, round 1

- **Branch:** `task/T-017-admin-cli`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

`apps/server/src/cli/guestbook-admin.ts` exposes `runCli(argv, ctx)` with injected env, stdout, stderr and a confirm function (null when stdin is not a TTY). Arguments are parsed with `node:util` `parseArgs` before the database is touched. It uses `loadConfig` for `DATABASE_PATH`, opens the existing file via `openDatabase` (WAL), and talks only to the guestbook repository (`listArchive`, `exportArchive`, `deleteByPublicId`, `purgePending`). No new dependencies and no SQL beyond one `sqlite_master` check for `schema_migrations`.

## Files changed

| File                                          | Change                                                   |
| --------------------------------------------- | -------------------------------------------------------- |
| `apps/server/src/cli/guestbook-admin.ts`      | added: CLI                                               |
| `apps/server/src/cli/guestbook-admin.test.ts` | added: 26 tests                                          |
| `apps/server/package.json`                    | modified: `guestbook` script                             |
| `README.md`                                   | modified: CLI usage subsection; dropped the T-017 dagger |

## Acceptance criteria

| #    | Criterion                        | Status | Evidence                                                                                                                                        |
| ---- | -------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Each command works on temp DB    | OK     | `list`, `export`, `delete`, `purge-pending` describes run `runCli` with injected argv/stdio against a temp file DB                              |
| AC-2 | Unknown id exit 2; no TTY aborts | OK     | `exits 2 for an unknown id`, `aborts when stdin is not interactive...`, `asks interactively and only deletes on a yes`                          |
| AC-3 | Concurrent with server (WAL)     | OK     | `serverDb` connection stays open through every test; `removes the message while the server connection stays usable` writes after the CLI closes |
| AC-4 | Refuses uninitialised DB         | OK     | `database guard`: missing file (not created, parent dir not created), file without `schema_migrations` (left empty)                             |

## Validation output

```
$ pnpm verify          -> exit 0
contracts 153 passed, server 340 passed (29 files), web 178 passed; format, lint, typecheck, build green
$ pnpm --filter @portfolio/server guestbook list
No database at ./data/portfolio.db  (usage text)   exit 1
```

The second command exits 1 by design on a machine with no database; it also proves the script runs under Node type stripping (`import.meta.main` entry).

## Tests added

- `guestbook-admin.test.ts`: 13 argument-parsing/usage cases (unknown command/flag, bad enum, bad limit, missing value, extra/missing positional, invalid config), DB guard, list ordering/filters/control-character quoting, JSON and CSV export (formula neutralisation, quoting, pending excluded, `--out` owner-only mode), delete (success, not found, non-interactive abort, interactive yes/no), purge (effect, unconfirmed no-op).

## Assumptions

- Declining or being unable to confirm exits 1 (spec only defines 0/1/2).
- `delete` confirms before looking the id up, since the port has no find-by-id; an unknown id with `--yes` gives exit 2.
- `list` prints tab-separated rows with the body JSON-quoted so control/escape characters from untrusted text never reach the terminal.
- CSV cells starting with `= + - @ tab CR` get a leading `'` (spreadsheet formula injection).
- Config errors (invalid env) exit 1 and print variable names only. Under `NODE_ENV=production`, `loadConfig` requires the full production env, which Railway has.
- `docs/operations.md` does not exist yet; the README subsection defers Railway usage to T-050.

## Deviations from spec or design

- None.

## Change Requests

- None.

## Open issues and follow-ups

- Windows file modes are not asserted (the mode test is skipped on win32).
