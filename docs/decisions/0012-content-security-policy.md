# ADR-0012: Content Security Policy and security headers

- **Status:** Accepted · **Amended:** 2026-10-25 for Cloudflare hosting and analytics · **Related:** NFR-05, T1, `security.md` §4–§5

## Context

- Astro's `security.csp` (since 6.0) emits a per-page `<meta http-equiv="content-security-policy">` with hashes of the scripts and styles Astro produces, including the Fonts API styles. It isn't active in `astro dev`, external resources must be listed, and `<ClientRouter />` isn't supported.
- A `<meta>` CSP can't carry `frame-ancestors`.
- On Cloudflare, `_headers` applies to static asset responses but **not** to Worker-generated responses (`/`, `/set-language`).
- The API (`api.jakublobos.com`) only serves JSON.

## Decision

1. **Page CSP (meta, hashed):** Astro `security.csp` with these directives:
   - `default-src 'self'`
   - `img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com`
   - `font-src 'self'`
   - `connect-src 'self' https://api.jakublobos.com https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com https://eu.i.posthog.com`
   - `manifest-src 'self'`
   - `frame-src https://challenges.cloudflare.com` (Turnstile, ADR-0015)
   - `scriptDirective.resources`: `'self' https://www.googletagmanager.com https://challenges.cloudflare.com` (plus PostHog's asset host only if verification shows it's needed)

   The API origin comes from `PUBLIC_API_BASE_URL` at build. No `unsafe-inline`, no `unsafe-eval`.

2. **Header policies:**
   - The site's static assets get headers from `_headers`; the Worker's responses get the same headers in code. One source of truth: `apps/web/security-headers.ts`, written to `dist/_headers` by an Astro integration.
   - The site CSP header carries only `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`. It must **not** contain fetch directives, which would block the hashed inline resources.
   - Other site headers: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy` (`security.md` §4).
   - The API sends `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` plus helmet's defaults, because it never serves HTML.
3. Code rules: no `style=` attributes, no `define:vars`, no inline handlers, no inline `<script>` for analytics (initialization lives in bundled modules), and no `<ClientRouter />`.
4. Verification: e2e fails on any `securitypolicyviolation`; a unit test checks that `_headers` and the Worker headers come from the same source.

## Alternatives considered

| Option                              | Why not                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Header-only CSP with all directives | It would need build-specific hashes in `_headers` (Astro emits them in meta); fragile |
| Nonces                              | Needs per-request HTML; the pages are static                                          |
| `'unsafe-inline'` styles            | Unnecessary with hashing                                                              |

## Sources

- https://docs.astro.build/en/reference/configuration-reference/ (`security.csp`)
- https://developers.cloudflare.com/workers/static-assets/headers/
- https://developers.google.com/tag-platform/security/guides/csp , https://posthog.com/docs/advanced/content-security-policy
