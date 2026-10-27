# T-043: Implementation report, round 1

- **Branch:** `task/T-043-audit`
- **Status claimed:** READY_FOR_REVIEW (AC-2 partially unmet, see Open issues)
- **Agent / model:** claude-sonnet-5-5

## Summary

Finished the two draft tools (`check-budgets.mjs`, `check-release-assets.mjs`), wired `check:budgets` into `verify` after the build and added `check:release`. `tools/` is now type-checked by the root `typecheck` (`tsc -p tools/tsconfig.json`). Ran Lighthouse 13.5.0 (mobile and desktop, `/` and `/pl`), fixed the 404 SEO issue and the missing favicon, and recorded the SEO checks, a keyboard walkthrough and an accessibility-tree review in `docs/audits/lighthouse-2026-10-27.md`.

## Files changed

| File                                    | Change                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `tools/check-budgets.mjs`               | added (draft reviewed against the spec, formatted): eager JS/CSS gzip budgets, lazy cap, font preload cap, zod scan |
| `tools/check-release-assets.mjs`        | added (draft reviewed, formatted): resume PDFs, OG images, sitemap, robots, `_headers`, `--release` env checks      |
| `package.json`                          | modified (CR): scripts `check:budgets`, `check:release`; `verify` ends with `check:budgets`; `typecheck` adds tools |
| `apps/web/src/components/seo/Seo.astro` | modified: 404 emits no canonical, hreflang, x-default or og:url (keeps `noindex`)                                   |
| `apps/web/public/favicon.svg`           | added: favicon (removes `/favicon.ico` 404)                                                                         |
| `apps/web/src/layouts/BaseLayout.astro` | modified: `<link rel="icon">`                                                                                       |
| `docs/audits/lighthouse-2026-10-27.md`  | added: scores, version, SEO checks, walkthrough                                                                     |

## Acceptance criteria

| #    | Criterion (short)                              | Status  | Evidence                                                                                                        |
| ---- | ---------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| AC-1 | `check:budgets` passes, part of `verify`       | pass    | output below: critical JS 12.5 / 35 KB, CSS 11.3 / 25 KB, fonts 1 / 1                                           |
| AC-2 | Lighthouse mobile 95 / 100 / 100 / 100         | partial | A11y, Best Practices, SEO are 100; mobile Performance is 88 on `/` and `/pl` (desktop 100). See Open issues     |
| AC-3 | `check:release` reports missing release assets | pass    | reports exactly the two resume PDFs                                                                             |
| AC-4 | Keyboard and SR walkthrough recorded           | pass    | audit doc; keyboard walk and accessibility tree reviewed, no blocking issues; real NVDA/VoiceOver left to owner |

## Validation output

```
$ pnpm verify          (exit 0)
 packages/contracts: 153 passed; apps/server: 343 passed; apps/web: 326 passed
 build: 6 pages
$ node tools/check-budgets.mjs
index.html critical JS 12.5 KB / 35.0 KB, CSS 11.3 KB / 25.0 KB, lazy 0.0 KB / 80.0 KB (0 chunks), preloaded fonts 1 / 1
pl.html    critical JS 12.5 KB / 35.0 KB, CSS 11.3 KB / 25.0 KB, lazy 0.0 KB / 80.0 KB (0 chunks), preloaded fonts 1 / 1
Budgets OK.
$ pnpm check:release   (exit 1, as expected)
Release assets: 2 problem(s)
  - missing resume/jakub-lobos-cv-en.pdf (D-10: the owner adds the resume PDFs)
  - missing resume/jakub-lobos-cv-pl.pdf (D-10: the owner adds the resume PDFs)
```

Lighthouse 13.5.0, final build, behind an HTTP/2 + brotli proxy emulating the Cloudflare edge (the raw emulator is HTTP/1.1 uncompressed; both are in the audit doc):

```
/    mobile  perf 88  a11y 100  bp 100  seo 100
/    desktop perf 100 a11y 100  bp 100  seo 100
/pl  mobile  perf 88  a11y 100  bp 100  seo 100
/pl  desktop perf 100 a11y 100  bp 100  seo 100
```

## Tests added

None, per the orchestrator ruling (running the tools is the verification). Note that the lazy-chunk logic of `check-budgets.mjs` is currently exercised with 0 lazy chunks, because no analytics chunk is referenced from the built home pages yet; the eager-vs-lazy and zod checks have not been seen failing.

## Assumptions

- `tools/*.mjs` are not type-checked (`checkJs` surfaces errors, including a missing `node:util.parseArgs` type that comes from a stray older `@types/node` on this host); the existing `tools/tsconfig.json` is now wired into `typecheck` and covers `tools/og/render-og.ts`.
- Lighthouse used the system Chrome 156; no dependency added.
- Favicon design: a plain "J" monogram using token ink/background hex values (SVG cannot read CSS tokens).

## Deviations from spec or design

- AC-2 mobile Performance (88 vs 95), see below.

## Change Requests (shared surfaces / dependencies)

- **CR-1 (approved by the orchestrator):** root `package.json` scripts `check:budgets`, `check:release`, `verify` tail and `typecheck` tail.

## Open issues and follow-ups

- **Mobile Performance 88 (target 95).** Cause: about 330 KB of web fonts (display font "Rubik Doodle Shadow" 210 KB latin plus 120 KB latin-ext) under Lighthouse's simulated 1.6 Mbps link; real observed FCP is about 290 ms. Rejected experiments (preload removal, `font-display: optional`, `content-visibility`) are listed in the audit doc. Fix needs a design decision: subset the display font to used glyphs. Owner/T-042.
- CLS 0.077 on mobile from marquee reflow at font swap.
- Copy notes (no edits made, i18n files off limits): hero paragraph in EN lacks a sentence break ("...react & typescript Designing web-apps in figma").
- Hero "Get my resume" link targets a PDF that is missing until D-10.
- Real NVDA/VoiceOver spot check is left for the owner.
- Local builds use `http://localhost:4321` in canonical/sitemap; `check:release --release` flags this and the missing `PUBLIC_*` env until a production build.
- `check-budgets.mjs` reports no analytics chunk in the home pages (the GA4/PostHog adapters do not appear in `dist/_astro`), so the 80 KB lazy cap is untested against real chunks.
