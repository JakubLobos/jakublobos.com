# Operations runbook

How to deploy, configure, back up, restore and fix the production setup. Design background: [ADR-0014](decisions/0014-hosting-cloudflare-workers-and-railway.md), [architecture.md](architecture.md), [security.md](security.md).

## 1. Overview

| Part | Where                                       | Deployed by                                                                    | URL                          |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| Site | Cloudflare Workers + static assets          | GitHub Actions `deploy-site.yml` on pushes to `main` that touch site inputs    | `https://jakublobos.com`     |
| API  | Railway service (Docker image), one replica | Railway auto-deploy from GitHub, filtered by `watchPatterns` in `railway.json` | `https://api.jakublobos.com` |
| Data | SQLite file on a Railway volume at `/data`  | n/a                                                                            | `/data/portfolio.db`         |

`www.jakublobos.com` redirects to the apex. `api.jakublobos.com` is **DNS-only** at Cloudflare (proxying it changes the client IP chain, see [security.md §6](security.md#6-rate-limiting-and-client-identity)).

The API image is built from `apps/server/Dockerfile` with the repository root as context. The server runs TypeScript directly (no build step), as the non-root `node` user, and answers SIGTERM by draining requests, stopping the review worker, then closing the database. The volume allows one replica only, and a redeploy causes a few seconds of downtime (Railway: replicas cannot share a volume).

## 2. Owner go-live checklist (D-23)

Work top to bottom; later steps need earlier values. Never paste secrets into chat, issues, commits or docs.

### 2.1 Cloudflare

- [ ] Add `jakublobos.com` as a zone in your Cloudflare account and point the registrar's nameservers at it.
- [ ] Create `www`: a proxied (orange cloud) `A` record to `192.0.2.1` (placeholder; it only needs to exist), then **Rules > Redirect Rules > Single redirect**: hostname equals `www.jakublobos.com` -> dynamic `concat("https://jakublobos.com", http.request.uri.path)`, 301, preserve query string.
- [ ] Create an API token (**My Profile > API Tokens > Create**, template _Edit Cloudflare Workers_, restricted to this account and the `jakublobos.com` zone). Note the **Account ID** from the dashboard.
- [ ] **Custom-domain route (code change, not yet done).** `apps/web/wrangler.jsonc` still has the route commented out, so `wrangler deploy` would publish only to `*.workers.dev`. Before the first deploy, uncomment `"routes": [{ "pattern": "jakublobos.com", "custom_domain": true }]` (this was outside T-050's allowed files; ask the orchestrator or make the one-line change yourself). Cloudflare creates the DNS record itself; delete any existing `A`/`AAAA`/`CNAME` for the apex first.

### 2.2 GitHub (T-051)

- [ ] **Settings > Environments > New environment** `production`; add yourself as a required reviewer if you want a manual approval before each site deploy.
- [ ] Secrets (repository or `production` environment): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- [ ] Variables: `PUBLIC_GA4_ID`, `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST` (`https://eu.i.posthog.com`), `PUBLIC_TURNSTILE_SITE_KEY`. They end up in client code, so they are variables, not secrets. Empty analytics values build the site without analytics.
- [ ] **Settings > Branches > Add rule** for `main`: require a pull request and the status checks `verify`, `e2e`, `edge-parity`.

### 2.3 Railway

- [ ] Create a **Hobby** project and a service **from the GitHub repo**. Leave _Root Directory_ empty (the repository root): `railway.json` and the Dockerfile path are relative to it. Choose an EU region (the privacy policy says so).
- [ ] Add a **volume** mounted at `/data` (service > Settings > Volumes). Volumes cannot be declared in `railway.json`.
- [ ] **Backups** tab of the service: enable the **Daily** schedule only (kept 6 days). Do not enable weekly or monthly: they keep personal data for 27 and 89 days, which is longer than section 5 and the privacy policy promise.
- [ ] Set the variables from section 3. If the first deploy logs a permission error on `/data`, add `RAILWAY_RUN_UID=0` (Railway's documented fix for non-root images on volumes) and note it in your records.
- [ ] **Settings > Networking > Custom Domain**: add `api.jakublobos.com`. In Cloudflare DNS create the `CNAME` (and the `TXT` verification record, if shown) exactly as Railway displays them, with the proxy **off** (grey cloud, DNS only). Wait for the certificate.
- [ ] Verify (section 4 for the IP check):
  ```
  curl -i https://api.jakublobos.com/api/health     # 200 {"data":{"status":"ok","db":"ok"}}, strict-transport-security present
  ```

### 2.4 Third parties

- [ ] **OpenAI**: a dedicated project, an API key restricted to it, prepaid credits, and a **monthly budget limit** (Billing > Limits). Key goes into Railway as `OPENAI_API_KEY`. Confirm the suitability model still exists (D-26): if `gpt-5-nano` is retired, set `OPENAI_SUITABILITY_MODEL` to its successor; a rejected model fails closed (nothing is published).
- [ ] **Gemini (alternative to OpenAI, free tier)**: create a key in Google AI Studio for a dedicated project and put it into Railway as `GEMINI_API_KEY`; set `MODERATION_PROVIDER` and `SUITABILITY_PROVIDER` to `gemini`. Free-tier quota exhaustion returns 429 and the post is retried later (fails closed). Read ADR-0016 first: outside the EEA, UK and Switzerland, free-tier content may be used to improve Google products and read by human reviewers, and the privacy policy says so. After the first deploy, post one test note and check the API log shows `gemini-moderation` and `gemini-suitability` with `outcome: ok`.
- [ ] **Resend**: add the domain `jakublobos.com`, then add **exactly the DNS records Resend shows** (SPF and DKIM) in Cloudflare, all DNS-only. Add a DMARC record: `TXT _dmarc  v=DMARC1; p=none; rua=mailto:<your address>` (tighten to `quarantine` once reports look clean). Create a sending-only API key limited to the domain.
- [ ] **GA4**: create the property, copy the measurement ID (`G-…`) into `PUBLIC_GA4_ID`; Admin > Data settings > Data retention: **2 months**.
- [ ] **PostHog** (EU cloud): create the project, put its key in `PUBLIC_POSTHOG_KEY`; enable _Cookieless server hash mode_ in the project's settings.
- [ ] **Turnstile** (Cloudflare > Turnstile > Add widget): hostname `jakublobos.com`, mode Managed. Site key -> GitHub variable `PUBLIC_TURNSTILE_SITE_KEY`; secret key -> Railway `TURNSTILE_SECRET_KEY`.
- [ ] **Phone number**: set `CONTACT_PHONE` (E.164) **only in Railway**. It must never appear in the repo, GitHub variables or the site build.

### 2.5 Content

- [ ] Privacy policy placeholders: `grep -rn "OWNER" apps/web/src` must print nothing. They cover the controller's postal address or registration, the Railway region, mailbox retention for contact messages and GA4 retention. Use the retention figures in section 5 for backups. Have the policy text reviewed (EN and PL).
- [ ] Resume PDFs in place and the Polish copy reviewed (D-23 items 8 and 9).

### 2.6 First deploy

1. Merge to `main`. Railway builds and starts the API (check **Deployments > Logs**).
2. Run `deploy-site.yml` (or push a site change). Approve the `production` environment if required.
3. Walk through section 7.

## 3. API environment variables (Railway)

Set in the service's **Variables** tab. Names only here; `.env.example` has the formats and defaults. Anything unsafe in production makes the process exit with 1 and log the offending variable **names** (never values).

| Variable                                      | Production value                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `NODE_ENV`                                    | `production` (the image already sets it)                                            |
| `CORS_ALLOWED_ORIGINS`                        | `https://jakublobos.com` (every origin must be `https://`)                          |
| `CLIENT_IP_SOURCE`                            | `x-real-ip`                                                                         |
| `MODERATION_PROVIDER`, `SUITABILITY_PROVIDER` | `openai` or `gemini` (`fake` is refused)                                            |
| `OPENAI_API_KEY`                              | secret; only when a provider is `openai`                                            |
| `GEMINI_API_KEY`                              | secret; only when a provider is `gemini`                                            |
| `MAILER`                                      | `resend` (`console` is refused)                                                     |
| `RESEND_API_KEY`                              | secret                                                                              |
| `MAIL_FROM`, `CONTACT_RECIPIENT_EMAIL`        | address on the verified domain; your mailbox                                        |
| `HUMAN_VERIFIER`                              | `turnstile` (`fake` is refused)                                                     |
| `TURNSTILE_SECRET_KEY`                        | secret (the production widget's, not the test key)                                  |
| `TURNSTILE_ALLOWED_HOSTNAMES`                 | `jakublobos.com` (`localhost` is refused)                                           |
| `CONTACT_PHONE`                               | the real number, set here and nowhere else                                          |
| `RESUME_DIR`                                  | do not set: the image sets `/data/resume`; the file is `/data/resume/cv.pdf` (§3.1) |
| `LOG_LEVEL`                                   | optional, default `info`                                                            |
| `PORT`, `HOST`, `DATABASE_PATH`               | do not set: Railway injects `PORT`; the image sets `HOST` and `/data/portfolio.db`  |

Optional tuning (`OPENAI_*_MODEL`, `GEMINI_MODEL`, timeouts, `MODERATION_SCORE_THRESHOLD`) keeps its default unless needed.

### 3.1 Uploading or replacing the resume

The resume PDF contains the owner's phone number, so it is never in git, the site build or the image (ADR-0018). The API serves `/data/resume/cv.pdf` (one English CV for both languages) after a Turnstile check. Until the file exists, the hero button answers "unavailable" and the API logs `resume file is not configured`.

Prerequisites: the Railway CLI (`railway update` to get a current version, `railway login`, `railway link` in a checkout, pick the production environment and the API service).

**Procedure (Railway CLI, volume files over SFTP; Railway changelog 2026-05-29):**

```
railway volume files --help          # confirm the exact upload syntax of your CLI version
railway volume files upload ./Jakub_Lobos_CV.pdf /resume/cv.pdf
railway volume files list /resume
```

The volume is mounted at `/data`, so the path inside the volume is `/resume/cv.pdf` (= `/data/resume/cv.pdf`). Run it from outside the repository (the PDF must never be copied into the checkout). To replace the resume, upload the new file to the same path; no redeploy is needed, because the API reads the file on every request.

Check: after the upload, press "Get my resume" on the live site. A PDF named `Jakub_Lobos_CV.pdf` downloads. If it answers "unavailable", look in the Railway logs for `resume file is not configured` (missing) or `not an acceptable PDF` (not a PDF, or over 5 MB).

**What was not verified (no Railway account or CLI was available when this was written):**

- The exact `railway volume files upload` argument order, whether the source and destination are positional, and whether `/resume/` has to exist first. `--help` is the source of truth; if the destination directory is missing, create it with whatever the same command group offers (or upload to `/cv.pdf` and move it from `railway ssh`: `mkdir -p /data/resume && mv /data/cv.pdf /data/resume/cv.pdf`).
- That the CLI needs a linked service or volume selection flag in a multi-volume project.
- Railway's docs describe `railway ssh` only as an interactive shell; nothing documents running a command with piped stdin, so `cat cv.pdf | railway ssh "cat > …"` is **untested** and not part of the procedure.

**Fallback if the CLI command is unavailable:** host the PDF on a private, expiring link (for example a time-limited signed URL from storage you control), run `railway ssh`, then `mkdir -p /data/resume && curl -fL -o /data/resume/cv.pdf '<url>'`, and delete the link afterwards.

## 4. Verifying the client IP (`X-Real-IP`)

Rate limiting keys on `X-Real-IP`, which Railway's edge sets. The app never logs IPs, so verify behaviour instead, once, after the first deploy. `GET /api/guestbook/latest` allows 60 requests per minute per client and returns `RateLimit` headers.

```
# network A (e.g. home): spend some of the budget
for i in $(seq 10); do curl -s -o /dev/null https://api.jakublobos.com/api/guestbook/latest; done
curl -si https://api.jakublobos.com/api/guestbook/latest | grep -i '^ratelimit'
# network B (e.g. phone hotspot): the budget must be fresh, not shared with A
curl -si https://api.jakublobos.com/api/guestbook/latest | grep -i '^ratelimit'
# spoofing must not reset the budget: the edge overwrites the header
curl -si -H 'X-Real-IP: 203.0.113.9' https://api.jakublobos.com/api/guestbook/latest | grep -i '^ratelimit'
```

Expected: B shows nearly the full budget while A is about 11 lower, and the spoofed request continues A's count. If both networks share one counter, the key is not the visitor (for instance a proxy sits in front of Railway): do not launch until you understand why. Global caps bound abuse meanwhile ([api.md §4](api.md#4-rate-limits-and-caps-server-constants)).

## 5. Backups, retention and restore

Two layers, both on Railway's infrastructure in the chosen region:

| Layer                      | What                                                                                       | Retention                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Railway **volume backups** | Daily snapshot of the whole volume (scheduled, section 2.3)                                | **6 days** (Railway's daily schedule)                                                       |
| `backup` command           | Consistent SQLite copy in `/data/backups/portfolio-YYYYMMDD.db`, made only when you run it | At most **7 files**, oldest removed on each run; they are also part of the volume snapshots |

Use these figures in the privacy policy: **a deleted guestbook message disappears from every copy within 6 days** (takedown, section 6, also removes `/data/backups` immediately; only the Railway snapshots remain until they rotate out). Run `backup` before upgrades and risky changes; it uses SQLite's online backup, so it is safe while the API is writing.

```
railway ssh                       # opens a shell in the running container
cd /app/apps/server
node src/cli/backup.ts            # -> Backup written to /data/backups/portfolio-<date>.db
ls -l /data/backups
```

Locally the same thing is `pnpm --filter @portfolio/server backup` (reads `DATABASE_PATH`).

### Restore

**A. From a Railway volume backup** (disk lost or corrupted): service > **Backups** > pick the date > **Restore**, review the staged change (a new volume is mounted at `/data`; the old one is kept, unmounted) and **Deploy**. Delete the old volume once the site is confirmed healthy.

**B. From a `/data/backups` file** (bad data, wanted rollback): point the API at a copy instead of overwriting the live file, because swapping a SQLite file under a running process is unsafe.

```
railway ssh
cp /data/backups/portfolio-YYYYMMDD.db /data/restored.db
exit
# Railway variables: DATABASE_PATH=/data/restored.db   -> redeploys; check /api/health and the archive
```

Afterwards `/data/backups` is still created next to the new database. Keep the old `portfolio.db` until you are sure, then remove it.

**Drill (do this once before launch; it was run locally on 2026-10-26):** create data, `backup`, delete the database, confirm the CLI reports `No database at …`, copy the backup to another name, point `DATABASE_PATH` at it and run `guestbook list`: the message is back. Repeat on Railway with a throwaway message after go-live, then `guestbook delete` it.

## 6. Admin CLI on Railway: archive export and takedown

The CLI opens the existing database; it never creates it or runs migrations. Message text goes to the terminal for `list` and `export`.

```
railway link                                          # once, in a checkout
railway ssh                                           # shell in the running container
cd /app/apps/server
node src/cli/guestbook-admin.ts list --status approved --limit 50
node src/cli/guestbook-admin.ts export --format json --out /tmp/archive.json    # owner-only file; then cat it and delete it
node src/cli/guestbook-admin.ts delete <publicId>     # asks to confirm in a terminal
node src/cli/guestbook-admin.ts purge-pending
```

Takedown, in full:

1. `list` to find the `publicId`, then `delete <publicId>`.
2. Remove the old copies: `rm -f /data/backups/*.db` (then run `backup` again if you want a fresh one).
3. Railway snapshots rotate out within 6 days; nothing to do.

If the CLI complains about missing variables inside the SSH session (the shell may not inherit the service environment), the CLI needs only the database path in a non-production mode: `NODE_ENV=development DATABASE_PATH=/data/portfolio.db node src/cli/guestbook-admin.ts list`. `railway ssh` behaviour was not verifiable locally; check `echo $DATABASE_PATH` on first use.

## 7. Deploys, verification and rollback

### Site (Cloudflare, via CI)

- Triggers: push to `main` touching `apps/web/**`, `packages/contracts/**` or `pnpm-lock.yaml`; or run **Actions > Deploy site > Run workflow** on `main`. CI runs first as a gate.
- Rollback: either revert the commit and push (a few minutes), or immediately from a machine with the token:
  ```
  pnpm --filter @portfolio/web exec wrangler versions list
  pnpm --filter @portfolio/web exec wrangler rollback <version-id>
  ```
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` must be set in that shell.

### API (Railway, auto-deploy)

- Triggers: pushes to the connected branch that change `apps/server/**`, `packages/contracts/**`, `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` (the image's inputs; site-only changes do not rebuild it). Railway waits for `/api/health` (60 s timeout) before switching traffic; a failing deploy leaves the previous one running.
- Restart policy: on failure, up to 5 retries.
- Rollback: service > **Deployments** > an earlier successful deployment > **Rollback** (or revert and push). Database migrations only move forward; do not roll back across a schema change without restoring a backup (section 5).

### After any deploy

```
curl -s https://api.jakublobos.com/api/health
curl -sI https://jakublobos.com/ | grep -i 'content-security-policy\|strict-transport'
```

Open the site with the console open: no CSP violations, guestbook loads, contact form and phone reveal work (use a real Turnstile challenge).

## 8. Rotating secrets

Rotate on any suspicion of leakage, and when someone with access leaves.

| Secret                                               | Steps                                                                                                                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY` | Create a new key in the provider dashboard, update the Railway variable (redeploys), confirm a guestbook post and a contact mail work, revoke the old key. |
| `TURNSTILE_SECRET_KEY`                               | Cloudflare > Turnstile > widget > rotate secret key; update Railway immediately. The phone reveal fails closed until then.                                 |
| `CLOUDFLARE_API_TOKEN`                               | Create a new scoped token, update the GitHub secret, re-run the deploy, delete the old token.                                                              |
| `CONTACT_PHONE`                                      | Change the Railway variable. Nothing else holds it.                                                                                                        |

## 9. Monitoring and logs

- **Logs**: Railway dashboard > Deployments > Logs, or `railway logs`. The app logs structured JSON without message bodies, emails, names or IPs. Railway and Cloudflare keep request metadata (IP, URL, time) under their own retention, as the privacy policy states.
- **Health**: Railway probes `/api/health` on deploy and restarts a crashed process. Add a free external monitor (UptimeRobot or Better Stack) for `https://api.jakublobos.com/api/health` and `https://jakublobos.com/`, alerting to your email.
- **Costs**: OpenAI usage page and the budget limit; Railway usage page; Resend dashboard (free tier 100 mails per day, the API caps at 60).

## 10. Upgrades

- **Node**: change `.nvmrc`, `engines.node` in `package.json`, `FROM node:…-slim` (twice) in `apps/server/Dockerfile` and the CI setup action together. Check that `better-sqlite3` ships a prebuild for the new Node (it is a native module; the image installs no compiler) and run `pnpm verify` and `pnpm test:e2e`.
- **pnpm**: edit `packageManager` in the root `package.json`; the image and CI read it from there.
- **Dependencies**: update with exact versions (`pnpm add -E`), run `pnpm verify`, `pnpm test:e2e`, and `pnpm audit --prod`. After merging, watch the Railway deploy and the CI deploy.
- **Before** any API upgrade that touches the schema: run `backup`.

## 11. Incident checklist

1. **Site down**: check Cloudflare status and the last `deploy-site` run; roll back (section 7).
2. **API down or 5xx**: Railway logs; `/api/health` (503 = database problem). A boot loop with `Invalid configuration. Check these variables: …` means a missing or unsafe variable; fix it in Railway. Roll back the deployment if the cause is a release.
3. **Bad message published**: `guestbook delete <publicId>` and remove old backups (section 6). Review the blocked-term list afterwards.
4. **Abuse or cost spike** (OpenAI or Resend): the global caps bound it. To stop it at once, revoke the provider key; the API then fails closed (nothing is published, contact returns 503). Then rotate (section 8).
5. **Suspected key leak**: revoke at the provider first, then rotate (section 8), then read the logs for the period.
6. **Data loss or corruption**: section 5 restore.
7. **Personal-data request** (access or erasure): the archive is the only store; use `list`/`delete`; reply from the address in the privacy policy.
8. Write down what happened and what changed.

## 12. Go-live security checklist ([security.md §9](security.md#9-go-live-security-checklist))

Tick each on the live system. Commands assume a checkout; none of them prints a secret.

- [ ] API: `NODE_ENV=production`, real providers, `CORS_ALLOWED_ORIGINS=https://jakublobos.com`, `CLIENT_IP_SOURCE=x-real-ip`. The process refusing to start with unsafe values is the check: section 3.
  ```
  curl -si -H 'Origin: https://evil.example' https://api.jakublobos.com/api/guestbook/latest | grep -i access-control-allow-origin   # prints nothing
  ```
- [ ] Observed client IPs verified once: section 4.
- [ ] `api.jakublobos.com` DNS-only CNAME to Railway; TLS active; HSTS on:
  ```
  curl -sI https://api.jakublobos.com/api/health | grep -i strict-transport-security
  ```
- [ ] Volume mounted at `/data`, automated daily backups on, restore drill done: sections 2.3 and 5.
- [ ] OpenAI budget limit set; keys only in Railway variables (section 2.4). `git grep -n "sk-"` returns nothing.
- [ ] Resend domain verified (SPF, DKIM) and DMARC present:
  ```
  dig +short TXT _dmarc.jakublobos.com
  ```
- [ ] Cloudflare: `www` redirects to the apex, the Worker was deployed with the scoped token, `_headers` is live:
  ```
  curl -sI https://www.jakublobos.com/ | grep -i '^location'
  curl -sI https://jakublobos.com/ | grep -i 'content-security-policy\|x-content-type-options'
  ```
- [ ] PostHog EU project with _Cookieless server hash mode_; GA4 retention set to the minimum (section 2.4).
- [ ] Turnstile widget for `jakublobos.com`; `TURNSTILE_ALLOWED_HOSTNAMES=jakublobos.com`; `CONTACT_PHONE` only in Railway; the real number is not in the repository (search for it by its digits):
  ```
  git grep -n "<digits of the real number>"      # must print nothing; also check the live HTML: curl -s https://jakublobos.com/ | grep -c "<digits>"  -> 0
  ```
- [ ] Dependencies: `pnpm audit --prod` clean or triaged.
- [ ] Browser console on the live site shows no CSP violations; <https://securityheaders.com> for both hosts is clean.
