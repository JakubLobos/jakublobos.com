# T-001: Review, round 1

- **Reviewed:** `task/T-001-workspace-scaffold` @ `58df1ea` against `main` @ `fa0a4d8` (merge base `8ea5bf9`; the only later `main` commit touches `tasks/README.md` and is ignored)
- **Reviewer / model:** claude-opus-5-5
- **Verdict:** APPROVED

## Gate results (re-run by reviewer)

| Command                                              | Result                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` (worktree)          | ✅ after deleting every `node_modules`, `apps/web/dist` and `apps/web/.astro`: "Lockfile is up to date, resolution step is skipped", 545 packages, exit 0                                                                                                                                       |
| `pnpm install --frozen-lockfile` (fresh `git clone`) | ✅ clone of the branch into a temp dir, exit 0, per-package `node_modules` created (temp dir deleted afterwards)                                                                                                                                                                                |
| `pnpm verify`                                        | ✅ exit 0. Prettier "All matched files use Prettier code style!"; `eslint .` no output; typecheck contracts Done, server Done, `astro check` 0 errors / 0 warnings / 0 hints; vitest "No test files found, exiting with code 0" ×3; `astro build` "2 page(s) built" (`/pl.html`, `/index.html`) |
| `pnpm dev` + `curl -s localhost:4321/api/health`     | ✅ `HTTP/1.1 200`, body `{"data":{"status":"ok"}}` (headers include `x-powered-by: Express`, i.e. proxied); direct `:3000/api/health` returns the same body                                                                                                                                     |
| Process cleanup                                      | ✅ Ports 3000 and 4321 were free before. `TaskStop` left orphans on Windows (`astro dev` PID 13460, `node src/main.ts` PID 132 and their `cmd`/`node --watch` parents 15952/16264). I killed those four PIDs. `netstat -ano` then showed no listener on 3000 or 4321                            |

## Scope check

Files outside _Allowed files_: none. The changed files are `.vscode/extensions.json`, `apps/server/**`, `apps/web/**`, `packages/contracts/**`, `pnpm-lock.yaml` and the implementer report. Root `package.json`, `eslint.config.js` and `tsconfig.base.json` are unchanged (checked with `diff` against `main`).

Unlisted dependencies: none. Lockfile `importers` match the task exactly:

- contracts: `zod 4.6.7`; dev `typescript 6.0.3`, `vitest 5.0.5`
- server: `@portfolio/contracts link`, `express 5.3.0`; dev `@types/express 5.0.6`, `@types/node 24.19.2`, `typescript 6.0.3`, `vitest 5.0.5`
- web: `@astrojs/check 0.9.12`, `@portfolio/contracts link`, `astro 7.4.2`; dev `typescript 6.0.3`, `vitest 5.0.5`

The lockfile has one `typescript@6.0.3`, one `@types/node@24.19.2` and one `zod@4.6.7`, and the `settings` block is unchanged. The 66 "deleted" lines in the diff are only a reordering: spot checks (`isexe`, `levn`, `keyv`, `tslib`, `math-intrinsics`, `util-deprecate`) appear the same number of times on `main` and on the branch.

## Acceptance criteria (independently verified)

| #    | Status | Evidence gathered by reviewer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | ✅     | Frozen install succeeds from a clean worktree and from a fresh clone (gate table above).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| AC-2 | ✅     | `pnpm verify` exit 0 (gate table). Lint, typecheck and test reach all 3 packages. Build output is `dist/index.html` (`<html lang="en">`), `dist/pl.html` (`<html lang="pl">`) and `dist/robots.txt`, with no `_astro` JS and no `zod` anywhere in `dist`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| AC-3 | ✅     | `pnpm dev` started `astro v7.4.2` on `http://localhost:4321/` and `node --watch … src/main.ts` on 3000 (`netstat`: PID 132 on `0.0.0.0:3000`, PID 13460 on `[::1]:4321`). The proxied curl returned `{"data":{"status":"ok"}}`. `/pl` renders `lang="pl"`, `/pl/` returns 404 (`trailingSlash: 'never'`). The log shows no type-stripping warnings, only "../../.env not found. Continuing without it."                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| AC-4 | ✅     | **Web:** `index.astro` imports `LOCALES`/`DEFAULT_LOCALE`, and the built `dist/index.html` contains `data-locales="en,pl" data-default="en"`. A temporary `src/pages/_review-neg.astro` assigning `LOCALES[1]` to `'de'` made `astro check` fail with `ts(2322) Type '"pl"' is not assignable to type '"de"'`, so the types resolve through the workspace link. The file was deleted. **Server:** `node --input-type=module -e "import { LOCALES, DEFAULT_LOCALE } from '@portfolio/contracts' …"` in `apps/server` printed `["en","pl"] en`. A temporary `src/_review_ac4.ts` (with `import type`) ran under plain `node` and printed the same; `tsc -p tsconfig.json` exited 0. A temporary negative file made `tsc` fail with TS2322 as expected. Both files were deleted. `main.ts` itself does not import contracts and logs nothing, which is consistent with the AC. |
| AC-5 | ✅     | Grep for `any` in all `src` and config `.ts` files finds nothing. ESLint passes with `--max-warnings 0` when run explicitly on every config file, `main.ts`, `index.ts` and both `.astro` pages, so `projectService` finds them all. Temporary files in `packages/contracts/src` and `apps/server/src` containing `any` were flagged by `no-explicit-any` and the type-aware `no-unsafe-assignment`, so type-aware linting is active per package. The temp files were deleted. Root ESLint config is unchanged.                                                                                                                                                                                                                                                                                                                                                             |

## Checklist

**Requirements and design**

- ✅ Every AC is met with evidence.
- ✅ Behaviour matches the task and architecture §2–§5/§8–§10. The small unlisted additions are covered in R1-01; the rest are judged acceptable below.
- N/A UI design fidelity: placeholder pages only.

**Correctness**

- ✅ Edge cases are N/A for a scaffold. See R1-04 for the `PORT` parse, which is a placeholder issue.
- ✅ Nothing is swallowed. A listen error such as `EADDRINUSE` crashes the process loudly, which is fine for this stub.
- N/A Races, listeners, timers.

**Architecture and maintainability**

- ✅ Layering: no web↔server imports. Web imports only the root `@portfolio/contracts` entry, never `/schemas`. `zod` is not linked into `apps/web/node_modules` and not in `dist`.
- ✅ `exports` map is `{ ".": "./src/index.ts", "./schemas": "./src/schemas.ts" }`, matching the task. `schemas.ts` is `export {};`.
- ✅ Scripts match the task text exactly:
  - server: `dev`, `start`, `typecheck`, `test`
  - web: `dev`, `build` (`astro check && astro build`), `typecheck`, `test`
  - contracts: `typecheck`, `test`
- ✅ Astro config matches the task:
  - `site` from `process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000'`
  - `output: 'static'`, `build.format: 'file'`, `trailingSlash: 'never'`
  - `server.port: 4321`, `vite.server.proxy['/api'] = 'http://localhost:3000'`
- ✅ tsconfigs:
  - contracts and server extend `../../tsconfig.base.json`. The base includes `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions` and `noEmit`.
  - server sets `types: ["node"]`.
  - web extends `astro/tsconfigs/strictest`.
  - every `include` covers the package's config files, so ESLint `projectService` works.
  - Minor redundancy: R1-03.
- ✅ Each Vitest config sets `passWithNoTests: true`. Web uses `getViteConfig()`.
- ✅ Erasable syntax only. Server `main.ts` uses `import express from 'express'`, has no relative imports, and runs under Node 24.20 type stripping with no flags.
- ✅ `.vscode/extensions.json` recommends exactly the three requested extensions, and `.gitignore` already whitelists it.
- ✅ Comments explain why only. The single comment (`main.ts:3`) states that the file is deliberately minimal and replaced by T-011.

**Type safety**

- ✅ No `any`, no `as` casts, no non-null assertions.
- N/A Discriminated unions.

**Security and privacy**

- ✅ No HTML sinks. Grep for `innerHTML|outerHTML|set:html|style=|eval(|console.` across the new sources finds nothing.
- N/A Input validation and SQL.
- ✅ No secrets or PII, and no new `PUBLIC_*` variables. `PUBLIC_SITE_URL` is only read in the config.
- ✅ CSP: no inline styles, scripts or handlers in the pages.

**Accessibility**

- ✅ Both pages have `<html lang>`, `<meta charset>`, viewport, `<title>` and a single `<h1>`.
- N/A Keyboard, focus, motion, axe: placeholder pages with no interactivity. Real pages are covered by T-020/T-021/T-040.

**Responsive and performance**

- N/A Breakpoints and layout shift.
- ✅ Zero client JS shipped. No dependency beyond the task list.

**Tests**

- ✅ The task requires none. `passWithNoTests` is used, with no fake tests.
- ✅ Deterministic: N/A.

**Process**

- ✅ Only allowed files changed.
- ✅ Commit `chore(workspace): scaffold web, server and contracts packages [T-001]` follows the convention.
- ❌ The report is complete and honest, except that its "Deviations: None known" contradicts its own Assumptions list (see R1-01).

### Implementer's undocumented or self-reported additions

- **`export type Locale`** (`packages/contracts/src/index.ts:2`): a minor deviation from "exporting only `LOCALES` and `DEFAULT_LOCALE`". It is harmless at runtime (erased). T-010 plans `Locale` in `src/types.ts`, so T-010 will have to move it. See R1-01.
- **Hidden `<p data-locales … data-default …>`** (`apps/web/src/pages/index.astro:13`): acceptable. AC-4 requires the import in an Astro page, and `noUnusedLocals` (strictest) would reject an import that is never rendered. It ships no JS, has no a11y impact because it is `hidden` and empty, and T-021 replaces the page.
- **`/// <reference types="vitest/config" />`** (`apps/web/vitest.config.ts:1`): acceptable. This is the documented Astro pattern for typing the `test` key in `getViteConfig()`, and the implementer reports that `astro check` needs it. It is not scope creep.
- **Config files in `include`**: this was required by the task's implementation notes and is done correctly.

### Peer-dependency warning

`pnpm peers check` reports exactly one issue, at the root importer `.`:

```
✕ unmet peer eslint  Installed: 10.13.0
  Wanted: "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9": eslint-plugin-jsx-a11y@6.10.2
```

T-001 did not introduce this. The root devDependencies are unchanged from `main`, where they were set during planning. None of the packages T-001 added has a peer issue. Lint works: `.astro` files are linted with `jsx-a11y-strict` rules and the run exits clean. So it does not matter for this task. It is recorded as a follow-up for the orchestrator.

## Findings

| ID    | Severity | Location                                                                                       | Problem                                                                                                                                                                                                                                                                                                                                                                                                       | Why (ref)                                                                                         | Expected fix                                                                                                                                                        |
| ----- | -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01 | MINOR    | `packages/contracts/src/index.ts:2`; `tasks/reports/T-001/implementation-r1.md` ("Deviations") | The file exports an extra `Locale` type although the task says `src/index.ts` exports "only `LOCALES` and `DEFAULT_LOCALE`". The report says the type is "needed to type `DEFAULT_LOCALE`", which is not true: `export const DEFAULT_LOCALE = 'en' satisfies (typeof LOCALES)[number];` works without an extra export. The report also lists this under Assumptions but then states "Deviations: None known". | T-001 Scope §1. T-010 Scope places `Locale` in `src/types.ts`. AGENTS.md rule 12 (honest report). | Either drop the export (use `satisfies`, or a non-exported alias), or keep it and list it under Deviations so T-010 knows to move it into `types.ts`. Not blocking. |
| R1-02 | NIT      | `apps/web/src/pages/pl/index.astro:1-2`                                                        | Empty frontmatter fence (`---` / `---`) with nothing in it.                                                                                                                                                                                                                                                                                                                                                   | Noise.                                                                                            | Remove the empty fence, or leave it; T-021 rewrites the page.                                                                                                       |
| R1-03 | NIT      | `apps/web/tsconfig.json:4`                                                                     | `"exclude": ["dist"]` repeats the `${configDir}/dist` exclude inherited from `astro/tsconfigs/base.json`. Overriding `include` does not reset `exclude`.                                                                                                                                                                                                                                                      | Avoid redundant config.                                                                           | Remove the line (optional).                                                                                                                                         |
| R1-04 | NIT      | `apps/server/src/main.ts:10`                                                                   | `Number(process.env.PORT ?? 3000)` maps `PORT=""` to `0`, which silently picks a random port, and maps `PORT=abc` to `NaN`, which throws.                                                                                                                                                                                                                                                                     | Architecture §7 (zod-validated config).                                                           | No action for T-001. T-011 must replace this with the zod-parsed `config.ts`.                                                                                       |

No BLOCKER, MAJOR or QUESTION findings.

## Previous findings status (round > 1)

N/A (round 1).

## Notes for orchestrator

1. **Spec drift in T-001 itself.** The task says `site` falls back to `'http://localhost:3000'`, which is the API port, while `.env.example:66` sets `PUBLIC_SITE_URL=http://localhost:4321`. The implementation follows the task text, so this is not an implementer finding. A later task (T-021, which builds canonical/hreflang from `PUBLIC_SITE_URL`) may want the fallback to be `:4321`. Also note that `astro.config.ts` reads `process.env`, but `pnpm dev`/`astro build` do not load the root `.env` into `process.env`. Without CI/shell env, the fallback is what applies.
2. **Pre-existing root peer issue:** `eslint-plugin-jsx-a11y@6.10.2` peers on `eslint ≤9` while the root pins `eslint@10.13.0`. It works today. Consider recording it in the dependency notes or an ADR, or tracking an upgrade, so later agents don't "fix" it ad hoc.
3. **Narrow `include` in `apps/web/tsconfig.json`.** The `include` is `[".astro/types.d.ts", "src", "astro.config.ts", "vitest.config.ts"]`, which replaces Astro's default `**/*`. Tasks that add web-root TS files outside `src`, such as `security-headers.ts` and `integrations/*.ts` (architecture §4.2), must extend `include`. Otherwise ESLint `projectService` reports "file not found in project". `worker/` has its own tsconfig. It is worth adding this to those tasks' notes.
4. **Windows dev cleanup:** stopping `pnpm dev` via the shell did not terminate the `astro dev` and `node --watch` children. Agents must kill by PID (`taskkill /PID … /T /F`) and confirm with `netstat`.
