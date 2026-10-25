# T-001: Workspace scaffold and toolchain wiring

|                          |                                                                           |
| ------------------------ | ------------------------------------------------------------------------- |
| **Wave**                 | 1 (first task; everything depends on it)                                  |
| **Depends on**           | none. Root tooling config already exists and is verified (planning phase) |
| **Blocked by decisions** | none                                                                      |
| **Parallel with**        | none                                                                      |
| **Size**                 | M                                                                         |
| **Requirements**         | NFR-08, NFR-09                                                            |

## Objective

Create the three workspace packages with their package manifests, tsconfigs, Vitest configs, and minimal runnable entry points, so that `pnpm install`, `pnpm verify`, and `pnpm dev` work end-to-end. Later tasks then only add code.

## References

- `docs/architecture.md` §2 (layout), §3, §4.1–4.2, §5.1, §8, §9, §10
- `docs/decisions/0001…`, `0009-typescript-6-and-node-type-stripping.md`
- `AGENTS.md`, root `package.json`, `tsconfig.base.json`, `eslint.config.js`

## Scope

1. **`packages/contracts`** (`@portfolio/contracts`): `package.json` (`type: module`, `exports: { ".": "./src/index.ts", "./schemas": "./src/schemas.ts" }`, scripts `typecheck: tsc -p tsconfig.json`, `test: vitest run`), `tsconfig.json` extending `../../tsconfig.base.json` (`include: ["src"]`), `vitest.config.ts`, `src/index.ts` exporting only `LOCALES` and `DEFAULT_LOCALE` (T-010 fills the rest), and an empty-but-valid `src/schemas.ts` (`export {}`).
2. **`apps/server`** (`@portfolio/server`): `package.json` with scripts:
   - `dev`: `node --watch --env-file-if-exists=../../.env src/main.ts`
   - `start`: `node --env-file-if-exists=../../.env src/main.ts`
   - `typecheck`: `tsc -p tsconfig.json`
   - `test`: `vitest run`
   - `tsconfig.json` (extends base, `types: ["node"]`, `include: ["src"]`), `vitest.config.ts`. `src/main.ts`: a minimal Express 5 app on `PORT` (default 3000) with `GET /api/health` → `{"data":{"status":"ok"}}`. Clearly minimal; T-011 replaces it.
3. **`apps/web`** (`@portfolio/web`): `package.json` with scripts `dev: astro dev`, `build: astro check && astro build`, `typecheck: astro check`, `test: vitest run`. `astro.config.ts` contains:
   - `site: process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000'`, `output: 'static'`
   - `build: { format: 'file' }`, `trailingSlash: 'never'`
   - `server: { port: 4321 }`
   - `vite.server.proxy` for `/api` → `http://localhost:3000`

   Also: `tsconfig.json` extending `astro/tsconfigs/strictest`; `vitest.config.ts` using `getViteConfig()`; placeholder `src/pages/index.astro` and `src/pages/pl/index.astro` rendering `<html lang="en|pl">` with a single `<h1>`; `public/robots.txt` placeholder (`User-agent: *` / `Allow: /`).

4. Each Vitest config sets `passWithNoTests: true` (no fake tests).
5. Root: confirm the `pnpm -r` scripts reach all packages and add a `.vscode/extensions.json` recommending `astro-build.astro-vscode`, `dbaeumer.vscode-eslint`, and `esbenp.prettier-vscode`.
6. Run `pnpm format` once so the repo is Prettier-clean, then commit the lockfile.

## Out of scope

Fonts, tokens, and layout (T-020); i18n config (T-021); real server structure (T-011); contracts content (T-010); static serving (T-016); e2e (T-040).

## Allowed files

`packages/contracts/**`, `apps/server/**`, `apps/web/**`, `.vscode/extensions.json`, `pnpm-lock.yaml`, root `package.json` (scripts only, if a script needs fixing; report why).

## Dependencies to install (exact)

- contracts: `zod@4.6.7`; dev `vitest@5.0.5`
- server: `express@5.3.0`; dev `@types/express@5.0.6`, `@types/node@24.19.2`, `vitest@5.0.5`
- web: `astro@7.4.2`, `@astrojs/check@0.9.12`; dev `vitest@5.0.5`
- Workspace links: server and web depend on `"@portfolio/contracts": "workspace:*"`.
- Add `typescript@6.0.3` (the exact root version) as a dev dependency of **each** package, so `tsc` and `astro check` resolve deterministically under pnpm's strict layout. Never install a different TypeScript version.

## Implementation notes

- The server runs TypeScript **without a build step** (Node 24 type stripping). Use `import express from 'express'`, include `.ts` extensions on relative imports, and use erasable syntax only.
- `astro check` needs `@astrojs/check` and the root TypeScript. If it complains about a TS version, report it; don't upgrade TypeScript.
- ESLint `projectService` must find each package tsconfig. `pnpm lint` must lint `.ts` and `.astro` in all packages without "file not found in project" errors. Config files like `vitest.config.ts` and `astro.config.ts` must be covered by a tsconfig `include` (or the ESLint `allowDefaultProject` setting, if you change the root config, report it as a Change Request).

## Acceptance criteria

- **AC-1** `pnpm install --frozen-lockfile` succeeds from a clean clone.
- **AC-2** `pnpm verify` passes (format, lint, typecheck for all 3 packages, tests, web build producing `apps/web/dist/index.html` and `apps/web/dist/pl.html`).
- **AC-3** `pnpm dev` starts Astro on :4321 and the server on :3000. `curl localhost:4321/api/health` returns the server's JSON through the proxy.
- **AC-4** `import { LOCALES } from '@portfolio/contracts'` works in both `apps/web` (an Astro page) and `apps/server` (`main.ts` logs nothing extra; prove it with a typecheck plus a Node run).
- **AC-5** No source file uses `any`; ESLint is clean with the root config unchanged (or with an approved Change Request).

## Tests required

None beyond the toolchain proving itself (AC-2/AC-3 evidence in the report).

## Validation

```
pnpm install --frozen-lockfile
pnpm verify
pnpm dev   # then, in another shell: curl -s localhost:4321/api/health
```

## Definition of done

Standard DoD, and the report includes the exact output of AC-1…AC-4.
