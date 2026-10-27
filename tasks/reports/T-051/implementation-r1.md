# T-051: Implementation report, round 1

- **Branch:** `task/T-051-ci` (based on `main` @ `f988f87`)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Added the CI workflow (verify, e2e, real-workerd edge parity, audit), the gated site deploy workflow, a nightly workflow, two small composite actions that hold the shared setup, a `@parity` e2e spec that pins the edge-emulator assumptions against real `wrangler dev`, and a README CI/deploy section. Nothing could be run on GitHub from here, so no workflow run exists yet.

## Files changed

| File                                    | Change                                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/actions/setup/action.yml`      | added: pnpm 11.4.0, Node from `.nvmrc`, pnpm store cache (`setup-node`), `pnpm install --frozen-lockfile`                                       |
| `.github/actions/playwright/action.yml` | added: cached `~/.cache/ms-playwright`, `playwright install --with-deps <browsers>`                                                             |
| `.github/workflows/ci.yml`              | added: push to `main`, PRs and `workflow_call`; jobs `verify`, `e2e` (needs verify), `edge-parity` (needs verify, `E2E_EDGE=wrangler`), `audit` |
| `.github/workflows/deploy-site.yml`     | added: push to `main` with site paths filter or manual; `ci` (reusable) then `deploy` in `production` environment                               |
| `.github/workflows/nightly.yml`         | added: Firefox e2e and `--repeat-each=5 --retries=0` Chromium stability run                                                                     |
| `e2e/edge-parity.spec.ts`               | added: `@parity` spec, skipped unless `E2E_EDGE=wrangler`                                                                                       |
| `README.md`                             | modified: "CI and site deployment" section                                                                                                      |

Actions pinned by SHA (all tags verified through the API today): checkout v7.0.1, setup-node v7.1.0, pnpm/action-setup v6.1.0, cache v6.1.0, upload-artifact v7.0.2. Top-level `permissions: contents: read` everywhere; `persist-credentials: false` on checkouts.

## Acceptance criteria

| #    | Criterion (short)                                        | Status  | Evidence                                                                                                                                                                                                                                                      |
| ---- | -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | CI passes on a branch push                               | PENDING | No remote run possible here. Local lint with the actionlint WASM build: `ci.yml ok`, `nightly.yml ok`; `deploy-site.yml` only reports `undefined variable "vars"` (false positive of that old build, which predates the `vars` context). `pnpm verify` green. |
| AC-2 | CI needs no secrets; only deploy uses Cloudflare secrets | OK      | `ci.yml`/`nightly.yml` reference no `secrets.*`; `CLOUDFLARE_*` appear only in the `wrangler deploy` step of `deploy-site.yml`, which is gated on `refs/heads/main`.                                                                                          |
| AC-3 | Server-only change does not trigger a site deploy        | OK      | `deploy-site.yml` `on.push.paths`: `apps/web/**`, `packages/contracts/**`, `pnpm-lock.yaml`. `workflow_dispatch` only deploys from `main`.                                                                                                                    |
| AC-4 | Actions pinned by SHA; minimal permissions               | OK      | Every `uses:` of a third-party action is `@<sha> # vX.Y.Z`; `permissions: contents: read` at workflow level, no job widens it.                                                                                                                                |

## Validation output

```
$ pnpm verify            -> EXIT=0
packages/contracts test: Tests 153 passed (153)
apps/server test:        Tests 340 passed (340)
apps/web test:           Tests 230 passed (230)
(format:check, lint, typecheck, build all green)

$ actionlint (npm WASM build, scratch script)
ci.yml ok / nightly.yml ok
deploy-site.yml: 4x 'undefined variable "vars"' (false positive, see AC-1)

$ E2E_EDGE=wrangler E2E_REUSE=1 playwright test --project=chromium-desktop e2e/edge-parity.spec.ts
  against the Node emulator + API started by me (PIDs killed afterwards)
  5 passed, 1 failed: "non-GET requests never get an asset": POST /privacy returned 200

$ playwright test --project=chromium-desktop e2e/edge-parity.spec.ts   (E2E_EDGE unset)
  6 skipped
```

The full `pnpm test:e2e` could not be run: ports 3000 and 8787 were held by processes I did not start (PIDs 32244, 7864, another session), and I did not touch them.

## Tests added

- `e2e/edge-parity.spec.ts` (`@parity`, runs only with `E2E_EDGE=wrangler`, request-level, no browser): `_headers` on asset responses; `/` as Worker over `ASSETS.fetch` (asset body plus Worker headers on top of `_headers`); `/index.html` -> 307 to `/`; `/privacy.html` -> 307 to `/privacy` (response headers recorded as an annotation, since whether `_headers` reaches redirects is not relied on); `/pl/nope` -> 404 with the Polish `404.html` and `_headers`, `/nope` -> English 404; POST to an asset is >= 400 (status recorded) and POST `/` is the Worker's 405 with `Allow: GET, HEAD`.

## Assumptions (low-impact decisions taken)

- pnpm comes from the root `packageManager` field (`pnpm@11.4.0`, added on `main`); the setup action no longer pins a version (round-1 fixup after orchestrator review).
- `deploy-site.yml` reuses `ci.yml` through `workflow_call` instead of `workflow_run`, because `workflow_run` cannot carry a paths filter. Consequence: a push to `main` that touches the site runs CI twice (once as CI, once as the deploy gate). `ci.yml` concurrency is keyed on `github.workflow`, so the two never cancel each other.
- The deploy builds with `astro build` (no `astro check`; the gate ran it) and calls `wrangler deploy` through `pnpm exec`, since `pnpm --filter ... deploy` is pnpm's own command.
- The `edge-parity` job always uploads its report (`!cancelled()`), because the redirect-header observation lives in the report, not in an assertion.

## Deviations from spec or design

- None. The spec's `audit` job and nightly are included; the README section is brief.

## Change Requests (shared surfaces / dependencies)

- **CR-1 (emulator divergence, `apps/web/edge-emulator/assets.ts`):** the emulator serves non-GET/HEAD requests to assets (POST `/privacy` -> 200). Real Cloudflare static assets are expected to reject them (405 is my expectation, unconfirmed), and the parity spec asserts `>= 400`. Proposed: make `fetchAsset` return 405 with `Allow: GET, HEAD` for other methods once the first CI run confirms the real status.
- **CR-2 (`apps/web/wrangler.jsonc`):** the custom-domain `routes` entry is still commented ("enabled at deployment (T-050/T-051)"). Without it `wrangler deploy` publishes only to `workers.dev`. Owner/T-050 should enable it with the Cloudflare account setup.

## Open issues and follow-ups

- No GitHub run exists: first-run results are unknown for everything below. Most likely to need a tweak: real `wrangler dev` under Linux CI (workerd comes from the platform optional dependency while `allowBuilds.workerd` is false), the exact real-workerd values the parity spec asserts (307 on html-handling redirects, `_headers` on the 404 page, `Vary` on `/`), and webKit system dependencies.
- Owner setup before the first deploy: the secrets and variables listed in the README, the `production` environment (add required reviewers for approval), branch protection requiring `verify`/`e2e`/`edge-parity`.
- `audit` can fail on a new advisory without any code change; it is a separate job so it does not block `e2e` or `edge-parity`.
