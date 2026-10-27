# T-017 review, round 1

- **Reviewer:** orchestrator (Opus); size S server task, reviewed directly
- **Verdict:** APPROVED

Checked `apps/server/src/cli/guestbook-admin.ts` and its tests against the spec and `guestbook-moderation.md` §8:

- Arguments parsed with `node:util` `parseArgs` before any DB access; unknown flags/values → exit 1 with usage.
- Opens only an existing, migrated DB (`schema_migrations` check); never creates or migrates, so a wrong path fails loudly.
- Uses only the repository port (`listArchive`, `exportArchive`, `deleteByPublicId`, `purgePending`); no SQL elsewhere.
- Destructive commands require a TTY confirmation or `--yes`; non-interactive without `--yes` refuses (exit 1).
- Untrusted text: `list` JSON-quotes bodies (no terminal control chars); CSV export neutralises formula prefixes; `--out` files are written with mode 0600 (D-17).
- No message text through the app logger; stdout only for `list`/`export`.

Accepted assumptions: exit 1 for declined/non-interactive confirmation; `delete` confirms before lookup (no find-by-id on the port), unknown id → exit 2; production `loadConfig` needs the full Railway env; Railway usage documented in T-050.

NIT (no action): the test file is on the larger side (26 tests), but each covers a distinct argument or command boundary.

Gate C: `pnpm verify` on the squash-merged tree.
