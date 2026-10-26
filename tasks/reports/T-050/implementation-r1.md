# T-050: Implementation report, round 1

- **Branch:** `task/T-050-ops` (based on `main`, merged again before the final verify)
- **Status claimed:** READY_FOR_REVIEW, with AC-1 and AC-2 (Docker) verified by the new CI job `api-image` on first push
- **Agent / model:** claude-sonnet-5-5

## Summary

Added the API container (`apps/server/Dockerfile`, root `.dockerignore`), `railway.json`, an online SQLite backup CLI (`pnpm --filter @portfolio/server backup`, with tests), `docs/operations.md` and a README deployment pointer. The image keeps the pnpm workspace layout (`pnpm install --prod --filter @portfolio/server...`) instead of `pnpm deploy`, because Node will not strip types from files under `node_modules`, which is where `@portfolio/contracts` would land.

## Files changed

| File                                 | Change                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/Dockerfile`             | added: 2-stage `node:24-slim`, prod deps only, non-root `node`, `/data`, `HEALTHCHECK` via node `fetch`, `CMD node src/main.ts` |
| `.dockerignore`                      | added: excludes `.env*` (keeps `.env.example`), `node_modules`, `.claude`, `apps/web`, tests, docs, data                        |
| `railway.json`                       | added: Dockerfile builder, health check, restart policy, watch patterns                                                         |
| `apps/server/src/cli/backup.ts`      | added: `backupDatabase()` (online backup, daily file, keep 7) and CLI entry                                                     |
| `apps/server/src/cli/backup.test.ts` | added                                                                                                                           |
| `apps/server/package.json`           | modified: `backup` script                                                                                                       |
| `docs/operations.md`                 | added: runbook                                                                                                                  |
| `README.md`                          | modified: Deployment section; admin CLI pointer                                                                                 |
| `.github/workflows/ci.yml`           | modified: `api-image` job (build, size, non-root, health, persistence, production refusal); orchestrator-approved               |

## Acceptance criteria

| #    | Criterion                                               | Status           | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | `docker build` succeeds, non-root, < 250 MB             | CI on first push | New `api-image` job in `ci.yml` (after `verify`): builds the image, asserts size < 250 MiB (logged) and `Config.User` = `node`. Not run locally: the Docker daemon is not running on this host.                                                                                                                                                                                                                                                                  |
| AC-2 | container serves, persists, refuses fakes in production | CI on first push | Same job: test env and a named volume; waits for `healthy` and `/api/health` with `db: ok` (native SQLite loaded); process not root; a guestbook POST shows in `docker exec … node src/cli/guestbook-admin.ts list` before and after `docker restart`; `NODE_ENV=production` with fakes exits 1 with `Invalid configuration`. Host-Node substitute checks (below) passed locally.                                                                                |
| AC-3 | backup consistent under writes; restore drill executed  | done             | test `copies a consistent snapshot while the live connection keeps writing`; drill output below                                                                                                                                                                                                                                                                                                                                                                  |
| AC-4 | `railway.json` keys verified                            | done             | <https://docs.railway.com/reference/config-as-code>, fetched 2026-10-26: `$schema` `https://railway.com/railway.schema.json`; `build.builder` `DOCKERFILE`, `build.dockerfilePath`, `build.watchPatterns`; `deploy.healthcheckPath`, `healthcheckTimeout` (seconds), `restartPolicyType` `ON_FAILURE`/`ALWAYS`/`NEVER`, `restartPolicyMaxRetries`. Volumes are not in the schema (<https://docs.railway.com/reference/volumes>); documented as a dashboard step. |
| AC-5 | runbook covers security §9 and D-23                     | done             | `docs/operations.md` sections 2 and 12, with commands                                                                                                                                                                                                                                                                                                                                                                                                            |

## Validation output

```
$ pnpm verify          (after git merge main)
exit 0   format:check, lint, typecheck clean
packages/contracts: 4 files, 153 tests passed
apps/server:        30 files, 343 tests passed
apps/web:           19 files, 255 tests passed
apps/web build: 6 page(s) built, 0 errors

$ restore drill (host Node, temp dir)
1 backup: Backup written to <dir>\backups\portfolio-20261026.db
2 after loss, exit 1 No database at <dir>\portfolio.db
3 restored list, exit 0 "pub-1 approved yellow - … "drill message""
4 production + fakes, exit 1 Invalid configuration. Check these variables: MODERATION_PROVIDER, SUITABILITY_PROVIDER, MAILER, HUMAN_VERIFIER, OPENAI_API_KEY, … TURNSTILE_ALLOWED_HOSTNAMES

$ image layout simulation (pnpm install --frozen-lockfile --prod --filter "@portfolio/server...", copied src, NODE_ENV=test)
health 200 {"data":{"status":"ok","db":"ok"}}
```

`better-sqlite3@13.0.3` ships `linux-x64` (glibc) and `linuxmusl-*` prebuilds, so `node:24-slim` (Debian, glibc) needs no compiler; loading it inside Linux was not verified.

## Tests added

- `apps/server/src/cli/backup.test.ts`: consistent copy while the live connection writes between copy cycles (integrity check and row count equal to the live DB), retention keeps the newest N and ignores other files, a missing database is refused without creating one.

## Assumptions (low-impact decisions taken)

- Workspace-layout install instead of `pnpm deploy` (see Summary). pnpm is installed with `npm install -g` at the version read from the root `packageManager`, so it cannot drift; corepack is not relied on.
- Backup directory is `<dir of DATABASE_PATH>/backups`; one file per UTC day (a rerun replaces it), written as `.partial` then renamed. It is run manually (a Railway volume is attached to one service, so a cron service cannot share it); scheduled protection is Railway's daily volume backup.
- `watchPatterns` also include `package.json` and `pnpm-workspace.yaml` (image inputs: `packageManager`, `allowBuilds`).
- Retention stated in the runbook for the T-033 privacy policy: Railway daily volume backups kept 6 days (weekly/monthly deliberately not enabled); `/data/backups` at most 7 files; takedown removes those files, so a deleted message is gone from all copies within 6 days.
- Restore from a file is done by pointing `DATABASE_PATH` at a copy, not by overwriting the live file.
- `X-Real-IP` verification uses the per-IP `RateLimit` headers of `GET /api/guestbook/latest` from two networks, since the app (rightly) never logs IPs; no code change.
- Site GA4/PostHog values are GitHub **variables** (as in the README from T-051), not secrets as the task text says.

## Deviations from spec or design

- `pnpm deploy` replaced by an equivalent prune that keeps `packages/contracts` source (the spec allows this).
- Dockerfile `USER node` is kept, but Railway documents that non-root images can hit permission errors on a volume (<https://docs.railway.com/reference/volumes>), fixed by `RAILWAY_RUN_UID=0`. The runbook lists it as a fallback; this is unverified.

## Change Requests (shared surfaces / dependencies)

- **CR-1 (decided: keep commented):** `apps/web/wrangler.jsonc` is not in the allowed files. The custom-domain `routes` entry stays commented out until the owner's Cloudflare zone exists; runbook 2.1 documents enabling it before the first deploy.
- **CR-2 (docs, proposal):** `docs/security.md` §8 already cites `docs/operations.md` for backups; nothing to change. `tasks/README.md` could mark the T-051 "custom-domain routes" follow-up as pending CR-1.

## Open issues and follow-ups

- `ci.yml` is also reused by `deploy-site.yml`, so a failing `api-image` job would block a site deploy; accepted.
- `.dockerignore` no longer lists `weppy-project-sync` (deleted from main).
- **Covered by CI job `api-image` on first push, not run locally:** `docker build`, image size, non-root, `HEALTHCHECK`, persistence across container restarts. **Not verified at all:** the exact `railway ssh` behaviour (working directory, inherited environment), Railway rollback and restore UI, the `RAILWAY_RUN_UID` question. The first Railway build is the real test; reviewers with Docker should run the task's Validation commands and report the image size.
- The `CORS`/HSTS curl checks in the runbook follow the code (`cors.ts` emits no header for unknown origins; HSTS is production-only) but were not run against a live host.
