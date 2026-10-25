# T-043: Performance, SEO, and accessibility audit plus release checks

|                          |                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------- |
| **Wave**                 | 6                                                                                 |
| **Depends on**           | all UI tasks (T-023…T-033)                                                        |
| **Blocked by decisions** | none (the release check reports the resume PDFs, D-10, until the owner adds them) |
| **Parallel with**        | T-041, T-050, T-051                                                               |
| **Size**                 | M                                                                                 |
| **Requirements**         | NFR-02, NFR-03, NFR-04                                                            |

## Objective

Verify and enforce the performance budgets, Lighthouse targets, SEO completeness, and release-asset presence, and fix what falls short.

## References

- `docs/requirements.md` NFR-02…NFR-04
- `docs/testing.md` §6
- `docs/architecture.md` §3 (no zod in the client)

## Scope

- `tools/check-budgets.mjs`: no dependencies; parses `apps/web/dist/index.html` and `pl.html`, resolves the JS and CSS referenced **eagerly** (scripts and stylesheets in the HTML plus their static imports), gzips them (`node:zlib`), and fails over the budgets (first-party critical JS ≤ 35 KB, CSS ≤ 25 KB, ≤ 1 preloaded font). Lazy analytics chunks (GA4 adapter, PostHog) are measured separately with a cap of 80 KB gzip total and must not be referenced eagerly. It also fails if any client asset contains zod or `@portfolio/contracts/schemas` signatures. Root script `check:budgets`, added to `verify` (Change Request to root `package.json`).
- `tools/check-release-assets.mjs`: verifies the resume PDFs (D-10), the OG images (T-035), `PUBLIC_SITE_URL=https://jakublobos.com` and `PUBLIC_API_BASE_URL=https://api.jakublobos.com` when `--release` is passed, a sitemap present, robots referencing the sitemap and disallowing `/set-language`, and `dist/_headers` present. Root script `check:release`.
- Lighthouse (mobile and desktop) on `pnpm preview` for `/` and `/pl`. Record the scores in `docs/audits/lighthouse-<date>.md`, and fix issues within component style and script files (list each fix).
- SEO checks: unique titles and descriptions, canonical, hreflang reciprocity, JSON-LD validity, `noindex` on 404s, sitemap alternates.
- Keyboard-only and screen-reader walkthrough (NVDA or VoiceOver) of the home page in both locales, documented in the audit file.

## Allowed files

`tools/**`, `docs/audits/**`, root `package.json` (scripts via Change Request), and small fixes in `apps/web/src/**` (each listed in the report; behavioural changes need a Change Request).

## Acceptance criteria

- **AC-1** `pnpm check:budgets` passes and is part of `pnpm verify`.
- **AC-2** Lighthouse mobile: Performance ≥ 95, Accessibility 100, Best Practices 100, SEO 100 for `/` and `/pl` (scores recorded with the Lighthouse version).
- **AC-3** `pnpm check:release` reports exactly which release assets are missing (expected: the resume PDFs until the owner adds them).
- **AC-4** The keyboard and screen-reader walkthrough is recorded with no blocking issues.

## Validation

```
pnpm verify
pnpm preview && npx lighthouse http://localhost:8787/ --preset=desktop   # and mobile default
pnpm check:release
```

## Definition of done

Standard DoD.
