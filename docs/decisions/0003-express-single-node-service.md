# ADR-0003: Express 5 for the API service

- **Status:** Accepted · **Amended by:** [ADR-0014](0014-hosting-cloudflare-workers-and-railway.md) (hosting: the static site moved to Cloudflare; Express no longer serves pages or negotiates locale) · **Date:** 2026-10-25 · **Related:** FR-40…FR-49, NFR-07

## Context

The backend needs two POST endpoints, one GET, a background moderation worker, CORS for one allowed origin, rate limiting, security headers, structured logging, and graceful shutdown. It runs as one container on Railway (ADR-0014).

## Decision

One Node 24 process running **Express 5.3** serves the JSON API under `/api` and runs the in-process moderation worker. Business logic lives in framework-free `domain/` modules behind ports. Express is a thin adapter (`http/`).

## Alternatives considered

| Option                                                                                                                                                                | Verdict                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Express 5**: mature, async errors reach the error handler, ecosystem (`helmet`, `express-rate-limit`, `cors`), well known by agents                                 | **Chosen**                                                        |
| Fastify: fast, built-in schema validation, but a different plugin model and no material benefit at this scale                                                         | Not needed                                                        |
| Hono: tiny and multi-runtime (could even run on Workers), but SQLite on a volume and the long-lived worker need a Node host anyway; smaller Node middleware ecosystem | Not needed                                                        |
| Astro server endpoints                                                                                                                                                | Couples the API to the site's deployment; rejected along with SSR |

## Consequences

- **Single instance** (SQLite, in-memory rate limiting, in-process worker), which matches Railway's no-replicas-with-volumes rule.
- Cross-origin from `jakublobos.com` requires a strict CORS allowlist (ADR-0014, `security.md`).

## Sources

- npm registry (2026-10-25): express 5.3.0, express-rate-limit 8.7.1, helmet 8.3.0, cors 2.8.6.
