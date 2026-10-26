# Jakub Łobos: Portfolio

A bilingual (EN `/`, PL `/pl`) personal portfolio for **jakublobos.com**, with a playful hand-drawn design, a carefully moderated visitor **guestbook** ("I love connecting people through the power of frontend"), and a **contact form** delivered by email.

> **Project state (2026-10-25): planning complete, implementation not started.** The repository contains documentation, decision records, the task backlog, agent instructions, and verified root tooling. The application packages are created by task **T-001**. Commands marked † become available once the referenced task is merged.

## Architecture at a glance

| Layer            | Choice                                                                                           | Hosting                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Site             | Astro 7 static build, TypeScript, plain CSS tokens, framework-free custom elements               | **Cloudflare Workers static assets** (`jakublobos.com`); a tiny Worker handles `/` language detection and `/set-language` |
| API              | Node 24 + Express 5 (CORS to the site origin)                                                    | **Railway** Hobby (`api.jakublobos.com`), one instance, volume for SQLite                                                 |
| Data             | SQLite (better-sqlite3); ≤ 100 guestbook rows; private archive                                   | Railway volume + backups                                                                                                  |
| Guestbook review | Local quality rules → OpenAI moderation → `gpt-5-nano` suitability check; newest message wins    | OpenAI API                                                                                                                |
| Email            | Resend HTTPS API (SMTP is blocked on Railway Hobby)                                              | Resend                                                                                                                    |
| Analytics        | GA4 (only after consent) + PostHog EU (cookieless unless accepted)                               | Google, PostHog                                                                                                           |
| Quality          | ESLint (type-aware, a11y, XSS bans), Prettier, Vitest, supertest, Playwright + axe, wrangler dev | GitHub Actions                                                                                                            |

**One monorepo, two deployables** ([ADR-0001](docs/decisions/0001-pnpm-workspaces-monorepo.md)): Cloudflare deploys `apps/web` from CI when site paths change; Railway deploys `apps/server` (Dockerfile, watch paths) when API paths change. Rationale: [`docs/architecture.md`](docs/architecture.md) and [`docs/decisions/`](docs/decisions/README.md).

## Prerequisites

- Node.js **≥ 24.11** (`.nvmrc`: 24) and pnpm **≥ 10** (developed with 12.14)
- For e2e: Playwright browsers (`pnpm exec playwright install --with-deps chromium webkit`) † T-040
- No accounts or keys are needed for development or tests (fake providers, console mailer)

## Setup

```bash
pnpm install
cp .env.example .env
```

## Commands

| Command                                                          | Purpose                                                                           |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm dev` † T-001                                               | `astro dev` on :4321 (proxies `/api`) + API on :3000                              |
| `pnpm verify`                                                    | format check · lint · typecheck · tests · build (the gate for every task)         |
| `pnpm format` / `pnpm lint:fix`                                  | auto-fix                                                                          |
| `pnpm preview`                                                   | production topology locally: site + Worker on :8787 (edge emulator), API on :3000 |
| `pnpm test:e2e` † T-040                                          | Playwright + axe against that topology with fakes                                 |
| `pnpm --filter @portfolio/server guestbook list\|export\|delete` | admin CLI: private archive and takedowns                                          |

### Local preview

`pnpm preview` builds the site with `PUBLIC_API_BASE_URL=http://localhost:3000`, then runs the site and the API side by side. The site is served by the Node edge emulator (`apps/web/edge-emulator/`), which reproduces Cloudflare Workers static-assets routing (`run_worker_first` from `wrangler.jsonc`, `auto-trailing-slash`, nearest `404.html`, `_headers`) and runs the real Worker code. Real `wrangler dev` (`pnpm --filter @portfolio/web preview:edge:wrangler`) crashes on some Windows builds, so CI on Linux uses it as a parity check. `pnpm --filter @portfolio/web preview:edge` serves an existing `dist/` on :8787 without the API.

### Guestbook admin CLI

Takedown path for messages automated moderation missed (`docs/guestbook-moderation.md` §8-9). It opens the existing database from `DATABASE_PATH` and never creates it or runs migrations; if the file or schema is missing it exits with an error.

```
pnpm --filter @portfolio/server guestbook list [--status approved|pending] [--limit 20]
pnpm --filter @portfolio/server guestbook export [--format json|csv] [--out file]
pnpm --filter @portfolio/server guestbook delete <publicId> [--yes]
pnpm --filter @portfolio/server guestbook purge-pending [--yes]
```

`delete` and `purge-pending` ask for confirmation; without a terminal on stdin they abort unless `--yes` is given. Exit codes: 0 success, 1 usage error or aborted, 2 message not found. `list` and `export` print message text to stdout; `export --out` writes an owner-only file instead. Production usage on Railway is documented with the deployment (T-050).

## Repository map

```
apps/web            Astro site + Cloudflare Worker + wrangler.jsonc   († T-001/T-016)
apps/server         Express API + Dockerfile (Railway)              († T-001/T-050)
packages/contracts  shared API types and validation rules            († T-001)
e2e/  tools/  docs/  tasks/  .claude/agents/  AGENTS.md
```

## Documentation

| Document                                                                                            | Contents                                      |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [requirements.md](docs/requirements.md)                                                             | FR/NFR requirements, scope, content inventory |
| [design-analysis.md](docs/design-analysis.md) · [design-system.md](docs/design-system.md)           | design spec, tokens                           |
| [architecture.md](docs/architecture.md) · [api.md](docs/api.md)                                     | system, modules, contract                     |
| [guestbook-moderation.md](docs/guestbook-moderation.md)                                             | newest-wins queue, layered review, archive    |
| [security.md](docs/security.md) · [testing.md](docs/testing.md)                                     | threat model and privacy; tests and gates     |
| [research.md](docs/research.md)                                                                     | verified findings with sources                |
| [agent-workflow.md](docs/agent-workflow.md) · [implementation-plan.md](docs/implementation-plan.md) | agent process, phases, handoff                |
| [decisions/](docs/decisions/README.md) · [tasks/](tasks/README.md)                                  | ADRs and owner decisions; backlog             |

## Development workflow

Task by task: implementation agent → independent review agent → orchestrator merge. Start with [`docs/implementation-plan.md` §5](docs/implementation-plan.md#5-handoff-how-to-start). Rules for agents: [`AGENTS.md`](AGENTS.md).

## Design reference

`docs/design/design.html` (the Claude Design bundle), its readable source `docs/design/extracted/design-source.html`, and reference screenshots in `docs/design/screenshots/` (regenerate with `node tools/design/capture-design.mjs` † T-040).
