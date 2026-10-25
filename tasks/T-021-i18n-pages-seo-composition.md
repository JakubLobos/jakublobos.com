# T-021: i18n infrastructure, pages, SEO, CSP, and page composition with stubs

|                          |                                                                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wave**                 | 3                                                                                                                                                                                 |
| **Depends on**           | T-020                                                                                                                                                                             |
| **Blocked by decisions** | none (D-07 approved: build privacy/404 with stub content; D-14: `PUBLIC_SITE_URL=https://jakublobos.com` in production; D-15: OG images come from T-035, so omit `og:image` here) |
| **Parallel with**        | T-012, T-013, T-015, T-016, T-022                                                                                                                                                 |
| **Size**                 | L                                                                                                                                                                                 |
| **Requirements**         | FR-01, FR-02, FR-05, NFR-04, NFR-05, NFR-13                                                                                                                                       |

## Objective

Establish the bilingual page skeleton and every frontend extension point, so section and chrome tasks can work in parallel **without touching shared files**: i18n helpers, all routes, SEO metadata, CSP configuration, the generic API client, shared content, and stub components with their final names composed into the pages.

## References

- `docs/architecture.md` §4 (entire), §6 (i18n table)
- `docs/agent-workflow.md` §4 (shared surfaces: after this task, the files you create are shared)
- `docs/design-analysis.md` §2 (page structure, order, anchors)
- `docs/security.md` §5 (CSP), `docs/decisions/0012-…`
- `docs/api.md` §1 (envelope), `docs/architecture.md` §4.4 (`ApiResult`)

## Scope

1. `astro.config.ts`:
   - `i18n` (`en` default unprefixed, `pl`)
   - `@astrojs/sitemap` with `i18n: { defaultLocale: 'en', locales: { en: 'en-US', pl: 'pl-PL' } }`, excluding 404 pages
   - `security.csp` with the directives in `security.md` §5. `connect-src` includes `PUBLIC_API_BASE_URL`; the analytics origins are added by T-032.
2. `src/i18n/locales.ts`: `Locale`, `isLocale`, `localeFromAstro(Astro)`, `alternatePath(locale, path)`, `htmlLang`, `ogLocale`.
3. `src/i18n/t.ts`: `defineMessages({ en, pl })`. Its type forces `pl` to have exactly `en`'s keys (nested objects allowed, values `string` or `(params) => string`). It returns `(locale) => messages`. Add a type-level test (`expectTypeOf`) for missing and extra keys.
4. Message modules (EN from the design, PL drafted): `messages/common.ts` (site name, skip link, section labels for `aria-label`s), `messages/seo.ts` (title and description per page), `messages/errors.ts` (generic: network, unavailable, rate_limited, unexpected).
5. `src/content/profile.ts`: name, role, email, GitHub and LinkedIn URLs and handles (**no phone number**: ADR-0015), languages (EN/PL strings), resume paths per locale (D-10).
6. `src/lib/breakpoints.ts`: the three media-query strings and a `matches(name)` helper (`design-system.md` §2.6), for T-023, T-026, and T-031.
7. `src/lib/api/client.ts`: `request<T>(path, init, schemaGuard)` → `ApiResult<T>` per `architecture.md` §4.4. A 10 s timeout. Never throws. The response is validated by a **lightweight hand-written type guard** passed by the caller (no zod in the client). Unit tests with a stubbed `fetch`.
8. Pages: `src/pages/{index,privacy,404}.astro` and `src/pages/pl/{index,privacy,404}.astro`, each a one-liner rendering `components/pages/{HomePage,PrivacyPage,NotFoundPage}.astro` with `locale`.
9. `components/seo/Seo.astro`: title, description, canonical, hreflang en/pl/x-default, OG/Twitter (`og:locale` + alternate), `theme-color` (`#f7f7f6`), and JSON-LD `Person` (name, jobTitle, url, sameAs GitHub/LinkedIn, knowsLanguage).
10. Complete `BaseLayout.astro`: props `locale`, `seoKey`, and `alternatePath`; `<html lang>`; `<Seo>`; chrome placement in the order of `design-analysis.md` §2.
11. **Stub components with final names** (minimal semantic markup, correct landmark and `id`, no styling beyond layout placeholders, one `<!-- STUB: T-0xx -->` comment each):
    - `site/{SkipLink, Header, MobileMenu, SocialAside, CustomScrollbar, DecorLayer, Footer, CookieBanner, LanguageSwitcher}.astro`
    - `sections/{Hero, MarqueeBands, Experience, Projects, Skills, Guestbook, Contact}.astro` (each `<section id=… aria-labelledby=…>`)
12. `HomePage.astro` composes the sections in order inside `<main id="top">`. `PrivacyPage` and `NotFoundPage` get stub content (T-033).
13. `public/robots.txt`: allow all, `Disallow: /set-language` (T-016 also ensures this), and a `Sitemap: https://jakublobos.com/sitemap-index.xml` line.

- Follow-up from T-001 review: fix `site` in `astro.config.ts` (fallback `http://localhost:4321`, not the API port) and load `PUBLIC_*` variables from the repo-root `.env` with Vite `loadEnv(mode, '../..', 'PUBLIC_')`.

- Follow-ups from the T-020 review (orchestrator-approved; you may edit `apps/web/src/styles/tokens.css` and `base.css` for these only):
  - R1-01: preload only the `latin` subset of the display font (`<Font cssVariable="--font-display" preload={[{ subset: 'latin' }]} />`); on PL pages also preload `latin-ext` only if the PL hero headline contains latin-ext glyphs.
  - R1-03: give the page wrapper `display: flow-root` so child margins can't shift the grid background; verify grid rows at y = 106/212 at 1440 against `desktop-1440-hero.png`.
  - R1-04: move `color-scheme: light` from `tokens.css` to `base.css` (`tokens.css` holds custom properties only).
  - Add `--leading-cookie: 1.65` and `--leading-status: 1.6` to `tokens.css` (`docs/design-system.md` §2.3) and extend `tokens.test.ts`.

## Out of scope

Real section and chrome implementations (T-023…T-033), translations review (T-034), OG images (T-035), Worker and `_headers` (T-016).

## Allowed files

`apps/web/astro.config.ts`, `apps/web/src/i18n/**` (locales, t, messages/{common,seo,errors}.ts), `apps/web/src/content/profile.ts`, `apps/web/src/lib/api/client.ts` (+ test), `apps/web/src/lib/breakpoints.ts` (+ test), `apps/web/src/pages/**`, `apps/web/src/components/{pages,seo}/**`, `apps/web/src/components/site/*.astro` (stubs), `apps/web/src/components/sections/*.astro` (stubs), `apps/web/src/layouts/BaseLayout.astro`, `apps/web/public/robots.txt`, `apps/web/package.json`, `pnpm-lock.yaml`.

## Dependencies (exact)

`@astrojs/sitemap@3.7.4`.

## Acceptance criteria

- **AC-1** The build outputs `index.html`, `pl.html`, `privacy.html`, `pl/privacy.html`, `404.html`, `pl/404.html`, and the sitemap. Each page has the correct `<html lang>`, unique localized `<title>` and description, canonical, and three hreflang links with absolute URLs from `PUBLIC_SITE_URL`.
- **AC-2** Each built page contains an Astro CSP `<meta http-equiv="content-security-policy">` with hashes and **no** `unsafe-inline`. Served via `pnpm preview` (once T-016 has merged; otherwise `astro preview`), there are no CSP violations in the console.
- **AC-3** A missing PL key is a **type error** (`astro check` fails; demonstrate with the type test).
- **AC-4** The home page contains all section stubs in the order and with the IDs from `design-analysis.md` §2; landmarks: one `header`, `nav`(s), `main`, `footer`.
- **AC-5** `api/client` unit tests: success, 422 with fields, 429 with Retry-After, 503, network error, timeout, non-JSON response, and a body failing the guard → `unexpected`.
- **AC-6** JSON-LD validates as JSON and contains no email or phone (privacy: those stay as visible links only).

## Validation

```
pnpm verify
pnpm --filter @portfolio/web build && grep -l 'hreflang' apps/web/dist/*.html apps/web/dist/pl/*.html
```

## Definition of done

Standard DoD. The report lists all new PL strings (D-02).
