# ADR-0001: pnpm workspaces monorepo

- **Status:** Accepted · **Date:** 2026-10-25 · **Related:** NFR-08, agent-workflow §4

## Context

The project has a static frontend, a backend, and a small shared API contract. Implementation is split across parallel agents, who need clear ownership boundaries, separate dependency sets, and one explicit shared interface.

## Decision

One repository with pnpm workspaces: `apps/web` (Astro), `apps/server` (Express), `packages/contracts` (API types, constants, zod schemas, shared validation rules). Root holds tooling config (ESLint flat config, Prettier, base tsconfig). `contracts` is consumed as TypeScript source (no build step).

## Alternatives considered

| Option                                   | Why not                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single package (`src/web`, `src/server`) | Mixed dependencies and tsconfigs (DOM vs Node types), blurry ownership for agents, client bundle risk from server imports                                                             |
| Two repositories                         | Contract drift, duplicated tooling, harder atomic changes                                                                                                                             |
| npm workspaces                           | Works, but pnpm's strict `node_modules` prevents phantom dependencies, and pnpm blocks dependency build scripts by default (supply-chain hardening). pnpm 12.14 is installed locally. |
| Turborepo/Nx                             | Unnecessary orchestration for 3 packages; `pnpm -r` handles topological ordering                                                                                                      |

## Deployment from the monorepo (added 2026-10-25, with ADR-0014)

The owner asked whether the backend should live in a separate repository. Answer: **no.** One repository deploys to two hosts.

| Target                     | How                                                                                                                                                                                                                                                                                                    | Avoids unrelated deploys via                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Cloudflare (site + Worker) | GitHub Actions on `main`: `pnpm install --frozen-lockfile` → `pnpm --filter @portfolio/web build` → `wrangler deploy` from `apps/web` (needs workspace access to `packages/contracts`, so it builds from the repo root, not an isolated folder)                                                        | workflow `paths:` filter: `apps/web/**`, `packages/contracts/**`, `pnpm-lock.yaml`   |
| Railway (API)              | Railway service connected to the same GitHub repo, building `apps/server/Dockerfile` with the **repo root** as build context (the image needs `packages/contracts` and the lockfile); config-as-code `railway.json` (Dockerfile path, health check, restart policy), with exact keys verified in T-050 | Railway **Watch Paths**: `apps/server/**`, `packages/contracts/**`, `pnpm-lock.yaml` |

Why not two repositories: the shared `contracts` package (API types and validation rules used by both sides) would have to be published and versioned, contract changes couldn't be atomic, and tooling, CI, and agent instructions would be duplicated. Railway documents shared monorepos as a supported setup (custom build commands + watch paths), and Cloudflare deploys from any directory via wrangler.

## Consequences

- Agents get directory-level ownership. `contracts` is the reviewable interface.
- One PR can change the API, contracts, and UI atomically. Each host redeploys only when its own paths change.
- Contributors need pnpm ≥ 10 (documented in README).
- Revisit if the number of packages grows beyond ~6 or build caching becomes valuable.
