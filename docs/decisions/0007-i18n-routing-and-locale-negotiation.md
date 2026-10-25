# ADR-0007: i18n routing and `/` locale negotiation in a Cloudflare Worker

- **Status:** Accepted · **Amended:** 2026-10-25 for the Cloudflare hosting decision (ADR-0014) · **Related:** FR-02…FR-05, NFR-04

## Context

The brief: English at `/` and Polish at `/pl`. `/` detects the browser language and redirects Polish visitors; explicit routes take precedence. Verified facts:

- Astro's `Astro.preferredLocale` only works for on-demand pages; our pages are static.
- Google: "Avoid automatically redirecting users from one language version of a site to a different language version". Googlebot usually crawls without `Accept-Language`.
- Cloudflare Workers static assets can run a Worker for selected paths only (`run_worker_first`), with all other paths served as free static assets.

## Decision

- Astro i18n: `locales ['en','pl']`, `defaultLocale 'en'`, `prefixDefaultLocale: false`. All pages are static (`build.format: 'file'` → `index.html`, `pl.html`, `privacy.html`, `pl/privacy.html`, `404.html`, `pl/404.html`).
- Worker (`apps/web/worker/index.ts`), invoked **only** for `/` and `/set-language`:
  - `GET /`: cookie `lang=pl` → **302** `/pl`; cookie `lang=en` → serve `index.html` via `env.ASSETS`. With no cookie, parse `Accept-Language` (q-values; best supported match). `pl` → 302 `/pl`, otherwise serve English. The response carries `Vary: Accept-Language, Cookie`, `Cache-Control: private, no-cache`, and the security headers.
  - `GET /set-language?lang=en|pl&to=<path>`: set the cookie (`lang`, 1 year, `Path=/`, `SameSite=Lax`, `Secure`, `HttpOnly`), then 302 to `to` **only if** `to` is in the allowlist of known site paths (prevents open redirects). Otherwise 302 to the locale home.
- The language switcher renders plain links to `/set-language?lang=…&to=…`. It works without JS and remembers the explicit choice. `robots.txt` disallows `/set-language`; SEO alternates come from hreflang in `<head>`.
- The negotiation logic is a pure function (`worker/negotiate-locale.ts`), unit-tested in Node with standard `Request`/`Response`.

## Alternatives considered

| Option                                                              | Why not                                                                                         |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Client-side JS redirect                                             | Flash of the wrong language; doesn't work without JS                                            |
| Cloudflare Rules (dashboard redirect rules on `accepted_languages`) | Configuration lives outside the repo and isn't testable; the cookie-precedence logic is awkward |
| Express negotiation (previous plan)                                 | The site no longer runs on the API server (ADR-0014)                                            |
| Pages Functions middleware                                          | Workers is Cloudflare's recommended platform for new projects                                   |

## Consequences

- The `lang` cookie is a functional cookie set at the visitor's explicit request, so it's consent-exempt and disclosed in the privacy policy.
- `/` and `/set-language` cost Worker invocations, far below the free limit. Everything else is a free static asset.
- Local and e2e environments run the real Worker with `wrangler dev`.
