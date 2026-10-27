# T-043: Implementation report, round 2

- **Branch:** `task/T-043-audit` (rebased on `main`)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Rebased on `main`, subset the display font so mobile Lighthouse Performance reaches 95 on `/` and `/pl`, verified the lazy-chunk budget against a build with stub analytics IDs, and retried `checkJs` for the tools.

## Files changed

| File                                                    | Change                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `tools/fonts/subset-display.mjs`                        | added: downloads pinned fontsource files, subsets with `subset-font`, writes two woff2 files |
| `apps/web/src/assets/fonts/rubik-doodle-shadow-*.woff2` | added: committed latin (150 KB) and latin-ext (23 KB) subsets                                |
| `apps/web/astro.config.ts`                              | modified: display family uses `fontProviders.local()` with two `unicode-range` variants      |
| `apps/web/src/layouts/BaseLayout.astro`                 | modified: display font `preload` (all variants; local fonts have no subset names)            |
| `tools/check-budgets.mjs`                               | modified: preloaded-font cap 1 to 2                                                          |
| `package.json`, `pnpm-lock.yaml`                        | modified: `subset-font` 2.9.0 (exact, root devDependency), script `fonts:subset`             |
| `docs/audits/lighthouse-2026-10-27.md`                  | modified: round 2 scores                                                                     |

## Items

0. `git rebase main`: clean. Lint/typecheck pass with the root `@types/node`.
1. Usage grep: `--font-display` is used by Hero h1, SectionHeading, GuestbookModal title, MobileMenu labels, PrivacyPage h2 (plus dev-only og/showcase pages). A browser pass over the six built pages (EN and PL, home, privacy, 404) listing every text node rendered in the display font found no character outside the approved set; none of it is user input. Lighthouse mobile is now 95/100/100/100 on both locales (audit doc).
2. Build with `PUBLIC_GA4_ID=G-E2ETEST000 PUBLIC_POSTHOG_KEY=phc_e2e_test_key PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`: `check:budgets` reports critical JS 13.6 KB, CSS 11.4 KB, **lazy 50.6 KB / 80 KB (4 chunks)**: `ga4`, `posthog`, `driver` and `module.slim` (PostHog), all found via the dynamic imports in `CookieBanner`'s script and not loaded eagerly. A throwaway copy of the tool with a 40 KB cap failed as expected, so the cap applies. No tool fix was needed. The default verify build has no analytics IDs, so it shows 0 lazy chunks.
3. `checkJs` still fails (43 errors): the tools are untyped JS with implicit-any parameters, `tools/design/capture-design.mjs` uses browser globals, and `subset-font` ships no types. Not included; `tools/**/*.ts` stay type-checked.
4. Favicon unchanged.

## Validation output

```
$ pnpm verify        exit 0 (contracts 153, server 343, web 326 tests passed; build ok)
Budgets OK (preloaded fonts 2 / 2)
$ pnpm check:release exit 1: only the two missing resume PDFs
Lighthouse 13.5.0 mobile / and /pl: 95 / 100 / 100 / 100; desktop 100 / 100 / 100 / 100
```

## Deviations and open issues

- Single subset file was not possible (`subset-font` handles one source font; Polish letters live in the latin-ext file), so the family has two small faces and Astro preloads both; budget raised to 2 fonts. The latin-ext preload costs 23 KB on EN pages.
- `subset-display.mjs` downloads `@fontsource/rubik-doodle-shadow@5.2.5` from jsDelivr instead of reading node_modules (the package is not installed; adding it would be another dependency). Byte-identical to the file Astro had been fetching.
- CLS 0.077 on mobile (marquee at font swap) remains; score is unaffected.
- Real NVDA/VoiceOver check still left to the owner.
