# T-050: API container, Railway + Cloudflare deployment, and operations runbook

|                          |                                                          |
| ------------------------ | -------------------------------------------------------- |
| **Wave**                 | 6                                                        |
| **Depends on**           | T-014, T-015, T-016, T-017                               |
| **Blocked by decisions** | D-23 (owner go-live actions) for the actual go-live only |
| **Parallel with**        | T-041, T-042, T-043, T-051                               |
| **Size**                 | L                                                        |
| **Requirements**         | NFR-07, NFR-11, NFR-12, security §7, §9                  |

## Objective

Make both deployables production-ready from the monorepo:

- the API as a hardened container on Railway (volume, health check, watch paths)
- the site as a Cloudflare Worker with static assets on `jakublobos.com`

Document how to deploy, configure, back up, restore, rotate secrets, take down content, export the archive, and upgrade.

## References

- `docs/decisions/0001-pnpm-workspaces-monorepo.md` (deployment from the monorepo), `0014-hosting-cloudflare-workers-and-railway.md`, `0004-sqlite-better-sqlite3.md`
- `docs/architecture.md` §1, §7, §8
- `docs/security.md` §2, §6, §7, §9
- `docs/research.md` §8 (Railway and Cloudflare facts)

## Scope

- `apps/server/Dockerfile` (build context = **repo root**):
  - build stage `node:24-slim`: pnpm (pinned; via corepack if available on Node 24, otherwise `npm i -g pnpm@<version>`), `pnpm install --frozen-lockfile --filter @portfolio/server...`, `pnpm deploy --filter @portfolio/server --prod /out` (or an equivalent prune that keeps `packages/contracts` source)
  - runtime `node:24-slim`: non-root `node` user, `NODE_ENV=production`, `DATABASE_PATH=/data/portfolio.db`, `EXPOSE 3000`, `HEALTHCHECK` on `/api/health`, `CMD ["node","src/main.ts"]` (path per the deploy layout)
  - `.dockerignore` at the root
- `railway.json` (config-as-code; **verify exact keys in the current Railway docs** and record them):
  - Dockerfile builder with path `apps/server/Dockerfile`
  - health check path `/api/health`
  - restart policy
  - watch patterns `apps/server/**`, `packages/contracts/**`, `pnpm-lock.yaml`
- `apps/server/src/cli/backup.ts` + script `backup`: an online SQLite backup (better-sqlite3 `backup()`) to `/data/backups/portfolio-YYYYMMDD.db`, keeping 7. This complements Railway's volume backups.
- `docs/operations.md` covering:
  1. Architecture recap and the URLs.
  2. **Owner go-live actions (D-23):**
     - Cloudflare zone and `www → apex` redirect rule
     - Railway Hobby service from GitHub with the variables from `.env.example` (production values: `CLIENT_IP_SOURCE=x-real-ip`, `CORS_ALLOWED_ORIGINS=https://jakublobos.com`)
     - a volume at `/data`; enable volume backups
     - custom domain `api.jakublobos.com` (DNS-only CNAME at Cloudflare)
     - OpenAI project + key + credits + budget limit
     - Resend domain verification (SPF, DKIM, DMARC in Cloudflare DNS) + API key
     - GA4 property ID and PostHog EU project key + cookieless setting → GitHub secrets for the site build
     - a Turnstile widget for `jakublobos.com` (site key → GitHub variable `PUBLIC_TURNSTILE_SITE_KEY`; secret → Railway `TURNSTILE_SECRET_KEY`), `TURNSTILE_ALLOWED_HOSTNAMES=jakublobos.com`, `HUMAN_VERIFIER=turnstile`, and the real `CONTACT_PHONE` set **only** in Railway
     - a Cloudflare API token scoped to Workers
  3. Deploy flows (Cloudflare via CI from T-051; Railway auto-deploy with watch paths); rollback for each.
  4. Verifying `X-Real-IP` (a temporary debug log of the resolved IP, then disable).
  5. Backups and **restore drill**.
  6. Archive export (`guestbook export`) and takedown (`guestbook delete`) via `railway ssh` / `railway run`.
  7. Rotating secrets.
  8. Monitoring: Railway logs, the health check, an optional free uptime monitor on `/api/health` and `/`.
  9. Upgrading Node and dependencies.
  10. Incident checklist.
  11. The full `security.md` §9 checklist.
- README deployment pointer.

## Allowed files

`apps/server/Dockerfile`, `.dockerignore`, `railway.json`, `docs/operations.md`, `apps/server/src/cli/backup.ts` (+ test), `apps/server/package.json` (script), `README.md` (deployment section).

## Acceptance criteria

- **AC-1** `docker build -f apps/server/Dockerfile .` succeeds. The image runs as non-root and is under 250 MB (report the size).
- **AC-2** `docker run` with test env + volume + port serves `/api/health` and the guestbook API. Data persists across container restarts. With `NODE_ENV=production` and fakes, the container refuses to start with a clear log line.
- **AC-3** The backup script produces a consistent copy while writes happen (test with a temp DB). The restore drill was executed locally and documented.
- **AC-4** `railway.json` keys are verified against the docs (URL + date in the report). Watch patterns cover exactly the API's inputs.
- **AC-5** The runbook covers every item in `security.md` §9 and D-23, with copy-pasteable commands.

## Validation

```
docker build -t portfolio-api:local -f apps/server/Dockerfile .
docker run --rm -p 3000:3000 -e NODE_ENV=test -e MODERATION_PROVIDER=fake -e SUITABILITY_PROVIDER=fake -e MAILER=console -e CORS_ALLOWED_ORIGINS=http://localhost:8787 -v portfolio-data:/data portfolio-api:local
curl -s localhost:3000/api/health
```

## Definition of done

Standard DoD.
