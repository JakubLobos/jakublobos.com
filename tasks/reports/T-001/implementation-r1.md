# T-001: Implementation report, round 1

- **Branch:** `task/T-001-workspace-scaffold`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Created `@portfolio/contracts`, `@portfolio/server` and `@portfolio/web` with manifests, tsconfigs, Vitest configs (`passWithNoTests`), and minimal entry points (contracts constants, Express 5 health endpoint, two placeholder Astro pages). Dependencies were added with exact versions as listed, plus `typescript@6.0.3` in each package. Root config is unchanged.

## Files changed

| File                                                                     | Change                                                                 |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `packages/contracts/{package.json,tsconfig.json,vitest.config.ts}`       | added                                                                  |
| `packages/contracts/src/{index.ts,schemas.ts}`                           | added: `LOCALES`, `DEFAULT_LOCALE` (plus `Locale` type); empty schemas |
| `apps/server/{package.json,tsconfig.json,vitest.config.ts}`              | added                                                                  |
| `apps/server/src/main.ts`                                                | added: minimal Express app, `GET /api/health`                          |
| `apps/web/{package.json,tsconfig.json,astro.config.ts,vitest.config.ts}` | added                                                                  |
| `apps/web/src/pages/index.astro`, `pages/pl/index.astro`                 | added: placeholder pages (`lang` en/pl, one `<h1>`)                    |
| `apps/web/public/robots.txt`                                             | added                                                                  |
| `.vscode/extensions.json`                                                | added                                                                  |
| `pnpm-lock.yaml`                                                         | modified                                                               |

## Acceptance criteria

| #    | Criterion                   | Status | Evidence                                                                                                                                                                                                                 |
| ---- | --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | frozen install              | pass   | `pnpm install --frozen-lockfile` -> "Lockfile is up to date, resolution step is skipped ... Done"                                                                                                                        |
| AC-2 | `pnpm verify`               | pass   | exit 0; prettier clean, eslint clean, typecheck x3, tests (no files, exit 0), `astro check` 0 errors; `dist/index.html`, `dist/pl.html` exist                                                                            |
| AC-3 | dev + proxy                 | pass   | `curl -s localhost:4321/api/health` -> `{"data":{"status":"ok"}}` (HTTP 200); direct :3000 returns the same                                                                                                              |
| AC-4 | contracts import web+server | pass   | web: built `dist/index.html` contains `data-locales="en,pl"` (page imports `LOCALES`); server: temp file importing `LOCALES`, `node src/_ac4.ts` printed `[ 'en', 'pl' ]`, `tsc -p tsconfig.json` OK (temp file removed) |
| AC-5 | no `any`, ESLint clean      | pass   | grep for `any` in sources: none; `eslint .` exit 0 with unchanged root config                                                                                                                                            |

## Validation output

```
Baseline (before changes): pnpm verify -> format ok, eslint ok, "No projects matched the filters" for typecheck/test/build (expected)
$ pnpm verify
All matched files use Prettier code style!
eslint . (no output)
tsc (contracts, server) Done; astro check: 0 errors, 0 warnings, 0 hints
vitest: "No test files found, exiting with code 0" (x3)
astro build: 2 page(s) built (/pl.html, /index.html); exit code 0
```

## Tests added

None (per task). Vitest configs use `passWithNoTests`.

## Assumptions

- Added `export type Locale` in contracts as a trivial derived type (spec says "only LOCALES and DEFAULT_LOCALE"; type is erased and needed to type `DEFAULT_LOCALE`). Easily removed if undesired.
- `vitest.config.ts`/`astro.config.ts` are included in each package tsconfig so ESLint `projectService` covers them; no root change needed.
- Used `process.env.PORT` dot notation because `@typescript-eslint/dot-notation` rejects bracket access.
- `apps/web/vitest.config.ts` needs `/// <reference types="vitest/config" />` so `astro check` accepts the `test` key.
- The server declares the `@portfolio/contracts` dependency but `main.ts` does not import it (kept minimal); AC-4 was proven with a temporary file.
- `index.astro` renders a hidden `data-locales` element purely to prove the contracts import; T-020/T-021 will replace the page.

## Deviations from spec or design

None known.

## Change Requests

None.

## Open issues and follow-ups

- `pnpm` printed a peer-dependency warning on install (`pnpm peers check`); not investigated, install and verify succeed.
- Dev servers started for AC-3 were stopped; no listeners remain on 3000/4321.
