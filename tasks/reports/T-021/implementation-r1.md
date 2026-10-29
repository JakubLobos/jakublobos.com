# T-021: Implementation report, round 1

- **Branch:** `task/T-021-i18n-pages-seo` (commit SHA in the hand-off message)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Bilingual page skeleton: i18n helpers (`locales.ts`, type-safe `defineMessages`), six static routes, `Seo.astro` (canonical, hreflang, OG/Twitter, JSON-LD), complete `BaseLayout`, hashed meta CSP, sitemap, generic `request<T>` API client, and final-named stubs for all chrome and sections composed in `HomePage`/`PrivacyPage`/`NotFoundPage`. Review follow-ups from T-001/T-020 are applied (site fallback and `.env` loading, latin-only preload, `flow-root`, `color-scheme` move, two leading tokens).

## Files changed

| File                                                                          | Change                                                                                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/astro.config.ts`                                                    | modified: `i18n`, `@astrojs/sitemap` (404s filtered), `security.csp`, `site` fallback, root `.env` loading, `vite.envDir` |
| `apps/web/src/i18n/{locales,t}.ts` (+ tests)                                  | added                                                                                                                     |
| `apps/web/src/i18n/messages/{common,seo,errors}.ts`                           | added (EN + PL)                                                                                                           |
| `apps/web/src/content/profile.ts`                                             | added (no phone)                                                                                                          |
| `apps/web/src/lib/breakpoints.ts` (+ test)                                    | added                                                                                                                     |
| `apps/web/src/lib/api/client.ts` (+ test)                                     | added                                                                                                                     |
| `apps/web/src/pages/{privacy,404}.astro`, `pages/pl/{privacy,404}.astro`      | added                                                                                                                     |
| `apps/web/src/pages/index.astro`, `pages/pl/index.astro`                      | modified: one-liners                                                                                                      |
| `apps/web/src/components/pages/{HomePage,PrivacyPage,NotFoundPage}.astro`     | added                                                                                                                     |
| `apps/web/src/components/seo/Seo.astro`                                       | added                                                                                                                     |
| `apps/web/src/components/site/*.astro` (9), `components/sections/*.astro` (7) | added: stubs with final names                                                                                             |
| `apps/web/src/layouts/BaseLayout.astro`                                       | modified: complete layout                                                                                                 |
| `apps/web/src/styles/{tokens.css,base.css,tokens.test.ts}`                    | modified: follow-ups R1-03 (in layout), R1-04, leading tokens                                                             |
| `apps/web/public/robots.txt`, `apps/web/package.json`, `pnpm-lock.yaml`       | modified                                                                                                                  |
| `apps/web/src/dev/showcase.astro`                                             | modified (1 line, see Deviations)                                                                                         |

## Acceptance criteria

| #    | Criterion                                   | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Pages, lang, title, canonical, hreflang     | ✅     | Build outputs `index.html pl.html privacy.html pl/privacy.html 404.html pl/404.html sitemap-index.xml sitemap-0.xml`. Inspected each: correct `<html lang>`, distinct localized titles, canonical, hreflang en/pl/x-default. With `PUBLIC_SITE_URL=https://jakublobos.com` every URL is absolute on that origin (`https://jakublobos.com/pl/404` etc.). Sitemap lists `/`, `/pl`, `/privacy`, `/pl/privacy` with en-US/pl-PL alternates; no 404s. |
| AC-2 | Meta CSP, no `unsafe-inline`, no violations | ✅     | Every page has `<meta http-equiv="content-security-policy">` with `sha256-` hashes; `grep -c unsafe` = 0. `astro preview` + headless Chrome (`--enable-logging`) on all 6 URLs: 0 console/CSP lines (a deliberately violating control page produced 1, so the detection works). `pnpm preview` (T-016) not merged yet.                                                                                                                            |
| AC-3 | Missing PL key is a type error              | ✅     | `t.test.ts` "rejects PL catalogues that miss or add keys": four `@ts-expect-error` cases (missing nested key, missing key, extra key, wrong value kind); `astro check` is 0 errors, so each expected error really occurs.                                                                                                                                                                                                                         |
| AC-4 | Section stubs, order, landmarks             | ✅     | `dist/index.html`: `#hero, (marquee aria-label), #experience, #projects, #skills, #guestbook, #contact` inside `<main id="top">`; one `header`, one `nav`, `main`, `footer`; each section has `aria-labelledby` pointing at an existing heading id.                                                                                                                                                                                               |
| AC-5 | API client behaviour                        | ✅     | `client.test.ts`: success + request shape (credentials omit, JSON header only with body, base-URL join), 422 fields (unknown codes dropped), 422 without fields, 429 with Retry-After (`30`, `soon`, absent), 503, 500/403 -> unexpected, rejected fetch, timeout (fake timers abort at 10 s), non-JSON, guard failure.                                                                                                                           |
| AC-6 | JSON-LD valid, no email/phone               | ✅     | Parsed `dist/pl.html` JSON-LD with `json.loads`: keys `@context @type jobTitle knowsLanguage name sameAs url`; asserted no `gmail`, `tel:` or `+48`.                                                                                                                                                                                                                                                                                              |

Follow-ups: site fallback `http://localhost:4321` and `.env` loading (see Deviations for the mechanism) ✅; R1-01 latin-only preload: built HTML has a single `<link rel="preload" as="font">` ✅; R1-03: screenshot `screenshots/home-1440.png`, pixel check at x=800 shows grid lines at y=106 and y=212 (`#ececea`), none at 105/107/211/213 ✅; R1-04 `color-scheme` now on `html` in `base.css` ✅; `--leading-cookie`/`--leading-status` in `tokens.css` and `tokens.test.ts` ✅.

## Validation output

```
$ pnpm verify
All matched files use Prettier code style!
eslint .                       (no output, exit 0)
apps/web typecheck: Result (45 files) - 0 errors, 0 warnings, 0 hints
packages/contracts test: Test Files 4 passed (4)  Tests 153 passed (153)
apps/server test:        Test Files 9 passed (9)  Tests  93 passed (93)
apps/web test:           Test Files 5 passed (5)  Tests  97 passed (97)
apps/web build: 6 page(s) built; sitemap-index.xml created; astro check 0 errors
exit=0

$ grep -l 'hreflang' apps/web/dist/*.html apps/web/dist/pl/*.html
apps/web/dist/404.html  index.html  pl.html  privacy.html  pl/404.html  pl/privacy.html
```

## Tests added

- `i18n/t.test.ts`: locale selection, parameterised messages, the type-level parity cases (AC-3).
- `i18n/locales.test.ts`: `alternatePath` matrix, `localeFromAstro` fallback, `isLocale`, html lang / og locale maps.
- `lib/breakpoints.test.ts`: the three query strings from design-system 2.6; `matches()` uses the right query.
- `lib/api/client.test.ts`: see AC-5.
- `styles/tokens.test.ts`: two new tokens.

## Screenshots (UI tasks)

`tasks/reports/T-021/screenshots/home-1440.png`: unstyled stubs only (all visual work is later tasks). Used for the grid-row check, not for design comparison.

## Assumptions (low-impact decisions taken)

- `request()` validates the envelope's `data` member with the caller's guard and returns it as `ApiResult.data` (so `T` is the inner payload, matching `ApiSuccess<T>`); callers never unwrap `{ data }` themselves.
- 502/503/504 map to `unavailable`; 429 maps by status even without a JSON body; a timeout is reported as `network`.
- Seo: `x-default` points at the English equivalent of the page; 404 pages additionally get `noindex` and are excluded from the sitemap.
- JSON-LD is emitted on every page.
- `twitter:card` is `summary` until T-035 supplies an OG image (then `summary_large_image`).
- The stub `Header` includes the stub `LanguageSwitcher` (a plain link to `/set-language?lang=<other>&to=<path>`) and an anchor nav, so landmarks and the switcher URL shape exist; T-023 replaces both.
- Hero PL headline is not yet written (T-024), so only the `latin` subset is preloaded on both locales. T-024 decides whether PL needs `latin-ext` preloaded.

## Deviations from spec or design

- **`BaseLayout` prop `path` instead of `alternatePath`:** the helper `alternatePath(locale, path)` would collide with the prop name inside the layout; `path` is the locale-neutral page path from which canonical, hreflang and the switcher derive.
- **`.env` loading:** `vite` is not a resolvable dependency of `apps/web` (pnpm strict), so `loadEnv(mode, '../..', 'PUBLIC_')` cannot be imported. `astro.config.ts` parses `PUBLIC_*` lines from the repo-root `.env` itself (real environment wins, empty means unset) and sets `vite.envDir` to the repo root so `import.meta.env.PUBLIC_*` in client code reads the same file.
- **`<main id="top">` placement:** in each page component (as specified); its `z-index` comes from a `.page > :global(main)` rule in `BaseLayout`.
- **`set:html` in `Seo.astro`:** Astro cannot interpolate into `<script>`, so JSON-LD is emitted with `set:html` carrying `JSON.stringify` of static constants with `<` escaped to `\u003c`; the one use has an `eslint-disable-next-line` with that reason. AGENTS rule 5 bans `set:html` generally, so this needs reviewer acceptance.
- **`src/dev/showcase.astro` (outside Allowed files):** one-line change to `<BaseLayout locale="en" seoKey="home" path="/__showcase">`, forced by the new required layout props. T-022/T-028 append to the same file; the line is far from their append points.
- **SkipLink stub** is `position: absolute` so the unstyled stub cannot shift the grid (R1-03 verification); T-023 styles it properly.

## Change Requests (shared surfaces / dependencies)

- None. (`PUBLIC_SITE_URL` in production is still set by CI/Cloudflare build env, and T-016 only registers its integration in `astro.config.ts`.)

## Open issues and follow-ups

- Local TS note: a stray `C:\Users\saltv\Desktop\node_modules\@types\node` (v14) outside the repo is picked up as the primary `@types/node` by `astro check` on this machine, which is why newer Node typings (`util.parseEnv`) were not usable in `astro.config.ts`. CI is unaffected, but it is worth removing locally.
- `pnpm preview` topology (T-016) not merged, so AC-2 was verified against `astro preview`.
- The PL strings below are drafts for the owner review (D-02, T-034).

### New PL strings (D-02)

`common.ts`: Przejdź do treści · Główna · Menu · Linki społecznościowe · Informacja o plikach cookie · Wprowadzenie · Umiejętności i informacje o mnie · Doświadczenie · Projekty · Umiejętności · Księga gości · Kontakt.
`seo.ts`: "Jakub Łobos — portfolio Frontend Developera" / "Portfolio Jakuba Łobosa, frontend developera tworzącego aplikacje webowe w React i TypeScript oraz projektującego je w Figmie." · "Polityka prywatności — Jakub Łobos" / "Jak jakublobos.com przetwarza Twoje dane: księga gości, formularz kontaktowy, pliki cookie i analityka." · "Nie znaleziono strony — Jakub Łobos" / "Ta strona nie istnieje. Wróć do portfolio Jakuba Łobosa."
`errors.ts`: "Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie." · "Usługa jest chwilowo niedostępna. Spróbuj ponownie za moment." · "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie." · "Coś poszło nie tak. Spróbuj ponownie."
`profile.ts`: "polski (ojczysty), angielski (B2)".
