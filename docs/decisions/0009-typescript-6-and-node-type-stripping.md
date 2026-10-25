# ADR-0009: TypeScript 6.0 pin; Node type stripping for the server

- **Status:** Accepted · **Date:** 2026-10-25 · **Related:** NFR-08

## Context

- npm `latest` for `typescript` is **7.0.2** (the native port), but `typescript-eslint@8.72.0` peers on `typescript >=4.8.4 <6.1.0`, and `@astrojs/check@0.9.12` peers on `^5 || ^6` (checked 2026-10-25).
- Node 24 strips TypeScript types natively. A prototype (Node 24.20, pnpm 12.14) ran a server `.ts` entry that imported a workspace package's `.ts` source with no flags and no warnings.
- Node 24 entered maintenance LTS on 2026-10-20 (end of life 2028-04-30). Node 26 becomes Active LTS on 2026-10-28. Astro 7 requires Node ≥ 22.23.4; Vitest 5 supports 22/24/26.

## Decision

- Pin `typescript@6.0.3` across the workspace. Revisit when typescript-eslint and @astrojs/check support 7.
- The server runs `.ts` directly with Node (`node --env-file-if-exists=… src/main.ts`), with no build or bundler step. `tsc --noEmit` checks types. Required compiler options (already in `tsconfig.base.json`): `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `noEmit`.
- Runtime: Node **24 LTS** (`engines >=24.11.0`, `.nvmrc 24`, Docker `node:24-slim`). Moving to Node 26 LTS is a one-line change once its LTS is established and `better-sqlite3` prebuilds are confirmed.

## Alternatives considered

| Option                 | Why not                                                |
| ---------------------- | ------------------------------------------------------ |
| TypeScript 7           | Lint and Astro type-check tooling don't support it yet |
| `tsx` runtime          | Extra dependency; native stripping is sufficient       |
| `tsc` build to `dist/` | Build step, output dir, and source maps for no benefit |
| esbuild/tsdown bundle  | Same; plus native module externals to manage           |

## Consequences

- No `enum`, `namespace`, or parameter properties in server and contracts code (lint and tsc enforce it). Relative imports must include `.ts`.
- Node refuses to strip types inside `node_modules`. Workspace packages resolve to their real path outside `node_modules`, which the prototype confirmed works. Third-party packages are plain JS as usual.

## Sources

- Node release schedule: https://github.com/nodejs/Release (schedule.json, accessed 2026-10-25)
- npm registry peer dependencies (accessed 2026-10-25)
