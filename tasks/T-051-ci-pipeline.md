# T-051: CI pipeline and site deployment workflow

|                          |                                                                              |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Wave**                 | 5 (as soon as T-040 merges)                                                  |
| **Depends on**           | T-016, T-040                                                                 |
| **Blocked by decisions** | none (assumes GitHub; the Cloudflare secrets come from the owner at go-live) |
| **Parallel with**        | T-029…T-033, T-017, T-035                                                    |
| **Size**                 | M                                                                            |
| **Requirements**         | NFR-08, NFR-09, NFR-11, security T16                                         |

## Objective

Run the quality gates on every push and pull request, and deploy the site (Cloudflare Worker) from `main` only when site inputs change and the gates are green. Railway deploys the API itself from GitHub (watch paths, T-050).

## References

- `docs/testing.md` §8
- `docs/agent-workflow.md` §3
- `docs/decisions/0001-pnpm-workspaces-monorepo.md` (deployment table), `0014-…`

## Scope

- `.github/workflows/ci.yml`:
  - triggers: push to `main`, pull requests
  - `verify` job: setup Node from `.nvmrc`, pnpm (lockfile version), store cache, `pnpm install --frozen-lockfile`, `pnpm verify`
  - `e2e` job (needs `verify`): Playwright browsers cached, `pnpm exec playwright install --with-deps chromium webkit`, `pnpm test:e2e`; upload the report on failure
  - `edge-parity` job (needs `verify`, Linux): run the `@smoke` e2e suite with `E2E_EDGE=wrangler` (real `wrangler dev`), so the Node edge emulator used locally is checked against the real Cloudflare runtime on every PR
  - `audit` job: `pnpm audit --prod --audit-level=high`
  - `permissions: contents: read`; concurrency cancels superseded runs
- `.github/workflows/deploy-site.yml`:
  - on push to `main` with `paths: apps/web/**, packages/contracts/**, pnpm-lock.yaml`; requires CI success (`workflow_run`, or reuse the verify job)
  - build with `PUBLIC_SITE_URL=https://jakublobos.com`, `PUBLIC_API_BASE_URL=https://api.jakublobos.com`, and `PUBLIC_GA4_ID` / `PUBLIC_POSTHOG_KEY` / `PUBLIC_POSTHOG_HOST` / `PUBLIC_TURNSTILE_SITE_KEY` from repository variables
  - `wrangler deploy` with `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets
  - a GitHub `environment: production` for manual-approval capability
- `.github/workflows/nightly.yml`: Firefox e2e and the repeat-each stability run.
- Actions pinned to commit SHAs (version comment). Least-privilege permissions per job.
- README CI and deploy section.

## Allowed files

`.github/**`, `README.md` (CI/deploy section).

## Acceptance criteria

- **AC-1** CI passes on a branch push (link the run). If no remote exists yet, validate with `actionlint` locally and state that the run is pending.
- **AC-2** CI needs no secrets (fake providers). Only the deploy workflow uses the Cloudflare secrets, and only on `main`.
- **AC-3** A change touching only `apps/server/**` doesn't trigger a site deploy (paths filter).
- **AC-4** Actions are pinned by SHA; permissions are minimal.

## Validation

```
actionlint   # if available
```

## Definition of done

Standard DoD.
