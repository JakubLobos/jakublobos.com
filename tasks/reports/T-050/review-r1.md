# T-050 review, round 1

- **Reviewer:** orchestrator (Opus); ops/config task, reviewed directly
- **Verdict:** APPROVED (container verification delegated to CI)

- `apps/server/Dockerfile`: multi-stage `node:24-slim`, prod deps for `@portfolio/server...` only, workspace layout kept so type stripping works for `@portfolio/contracts`, pnpm version from `packageManager`, non-root `USER node`, `/data` owned by `node`, `HEALTHCHECK` via `node` fetch, `node` as PID 1 for SIGTERM draining. `better-sqlite3@13` glibc prebuild matches the slim image.
- `.dockerignore` excludes secrets, web, docs, tests, local data; the stray `weppy-project-sync` entry was removed.
- `railway.json`: Dockerfile builder, watch patterns, `/api/health` healthcheck, `ON_FAILURE` restarts; the volume is a documented dashboard step.
- `apps/server/src/cli/backup.ts` (+ tests): online SQLite backup, keeps 7. Retention statement for the privacy policy: a deleted message disappears from every copy within 6 days.
- `docs/operations.md`: go-live checklist (D-23, T-051 GitHub setup, Turnstile production keys, custom-domain route, privacy placeholders), admin CLI via `node src/cli/…` (no pnpm in the image), backups/restore drill, rollback, rotation, incidents.
- CI `api-image` job (added at the orchestrator's request): build, size < 250 MB, non-root, healthy, `db: ok` (native binding loaded), guestbook round trip survives a restart, production refuses fake providers.

Not verifiable locally (no Docker daemon, no Railway): image build and run (covered by the CI job on first push), `railway ssh`, volume permissions, restore UI. CR-1 (custom-domain `routes` in `wrangler.jsonc`) stays commented until the owner's Cloudflare zone exists (runbook §2.1). Gate C: `pnpm verify` on the squash-merged tree.
