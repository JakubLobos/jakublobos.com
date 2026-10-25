# T-016: Cloudflare Worker (locale negotiation, `/set-language`), headers, and wrangler setup

|                          |                                                                 |
| ------------------------ | --------------------------------------------------------------- |
| **Wave**                 | 3                                                               |
| **Depends on**           | T-001 (and T-011 only for the `pnpm preview` script's API part) |
| **Blocked by decisions** | none (D-14 decided: Cloudflare Workers static assets)           |
| **Parallel with**        | T-012, T-013, T-015, T-021, T-022                               |
| **Size**                 | M                                                               |
| **Requirements**         | FR-02, FR-03, FR-04 (edge side), NFR-04, NFR-05                 |

## Objective

Make the static site deployable as a Cloudflare Worker with static assets:

- a tiny Worker that runs **only** for `/` (language negotiation) and `/set-language` (explicit switch, open-redirect-safe)
- a single source of truth for security and cache headers, emitted to `dist/_headers` for static assets and applied by the Worker to its own responses
- `wrangler dev` / `pnpm preview` that reproduce the production topology locally

## References

- `docs/decisions/0014-hosting-cloudflare-workers-and-railway.md`, `0007-i18n-routing-and-locale-negotiation.md`, `0012-content-security-policy.md`
- `docs/architecture.md` §4.1, §4.2 (`wrangler.jsonc`, `worker/`, `security-headers.ts`), §6 (negotiation rules: implement exactly), §8
- `docs/security.md` §4 (site headers and cache rules), T13
- `docs/testing.md` §3 "edge Worker"
- `docs/research.md` §8 (Cloudflare facts)

## Scope

- `apps/web/wrangler.jsonc`:
  - `name: "jakublobos-com"`, `main: "worker/index.ts"`, a current `compatibility_date`
  - `assets: { directory: "./dist", binding: "ASSETS", not_found_handling: "404-page", html_handling: "auto-trailing-slash", run_worker_first: ["/", "/set-language"] }`
  - routes / custom domain for `jakublobos.com` documented but commented (deployment in T-050/T-051)
- `apps/web/security-headers.ts`: exports `SITE_SECURITY_HEADERS` (`security.md` §4) and `CACHE_RULES` (pattern → `Cache-Control`).
- `apps/web/integrations/cloudflare-headers.ts`: Astro integration (`astro:build:done`) that writes `dist/_headers` from those constants, staying within Cloudflare's limits (100 rules, 2,000 chars per line). Registered in `astro.config.ts` (allowed edit).
- `apps/web/worker/negotiate-locale.ts` (pure): `negotiateLocale({ acceptLanguage, cookieLang }): Locale`.
- `apps/web/worker/set-language.ts` (pure): `resolveSetLanguage(url) → { cookie, location } | { error: 400 }`, with the `to` allowlist (`/`, `/pl`, `/privacy`, `/pl/privacy`).
- `apps/web/worker/index.ts`: the fetch handler.
  - `/`: per `architecture.md` §6, serving English via `env.ASSETS.fetch(new Request(new URL('/index.html', request.url)))`.
  - `/set-language` → 302 with `Set-Cookie`.
  - Any other path that reaches the Worker (shouldn't happen) → `env.ASSETS.fetch(request)`.
  - Every Worker response gets `SITE_SECURITY_HEADERS` and the documented `Vary` / `Cache-Control`.
- `apps/web/worker/tsconfig.json` with `@cloudflare/workers-types`. The ESLint projectService must cover it.
- Scripts:
  - `apps/web/package.json`: `"preview:edge": "wrangler dev --port 8787"`, `"deploy": "wrangler deploy"`.
  - Root `"preview"`: build the site with `PUBLIC_API_BASE_URL=http://localhost:3000`, then `pnpm --parallel --filter @portfolio/web --filter @portfolio/server run preview:topology`. Each package defines `preview:topology` (web: `wrangler dev --port 8787`; server: `start` with `CORS_ALLOWED_ORIGINS=http://localhost:8787`). No extra process-runner dependency. Document it in the README.
- `public/robots.txt`: add `Disallow: /set-language` (allowed edit).

## Out of scope

Actual Cloudflare deployment and DNS (T-050/T-051), the switcher UI (T-023), API CORS (T-011).

## Allowed files

`apps/web/wrangler.jsonc`, `apps/web/security-headers.ts`, `apps/web/integrations/cloudflare-headers.ts`, `apps/web/worker/**`, `apps/web/astro.config.ts` (register the integration only), `apps/web/package.json`, `apps/web/public/robots.txt`, `apps/server/package.json` (`preview:topology` script only), root `package.json` (`preview` script), `README.md` (preview section), `pnpm-lock.yaml`.

## Dependencies (exact)

web dev: `wrangler@4.152.0`, `@cloudflare/workers-types@5.20261025.1`.

## Acceptance criteria

- **AC-1** The Worker unit tests pass the full matrix in `docs/testing.md` §3 "Worker". Run with Vitest in Node (standard `Request`/`Response`; a stub `ASSETS`).
- **AC-2** `/set-language` never redirects off-site or to non-allowlisted paths (`https://evil.example`, `//evil`, `/\evil`, `%2F%2Fevil`, `/unknown`).
- **AC-3** `pnpm build` produces `dist/_headers`. A test asserts that every header from `SITE_SECURITY_HEADERS` appears for `/*` and that the Worker response for `/` carries the same set (one source).
- **AC-4** `wrangler dev` serves `/pl` (from `pl.html`), `/privacy`, and `/pl/privacy`, and `/pl/nope` gets `pl/404.html` with status 404. `curl -sI -H 'Accept-Language: pl' localhost:8787/` → 302 `/pl`. The Worker isn't invoked for `/pl` (check: `wrangler dev` logs show no invocation, or a header only the Worker sets is absent).
- **AC-5** `pnpm preview` runs the site on :8787 and the API on :3000, and a page on :8787 can call `GET http://localhost:3000/api/health` (CORS OK). Requires T-011 merged; otherwise demonstrate the site part and note it.

## Validation

```
pnpm verify
pnpm --filter @portfolio/web test -- worker
pnpm --filter @portfolio/web build && pnpm --filter @portfolio/web preview:edge
```

## Definition of done

Standard DoD.
