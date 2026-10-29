# T-035: Implementation report, round 1

- **Branch:** `task/T-035-og-images`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

A dev-only route `/__og/[locale]` renders a 1200 × 630 canvas from the real `PaintDrips`, `Logo` and `Mascot` components, the hero headline and tokens. `tools/og/render-og.ts` starts `astro dev` on a free port, screenshots both locales with Playwright (one Chromium, reduced motion, scale 1), writes `apps/web/public/og/og-{en,pl}.png`, and stops the server. `Seo.astro` now emits absolute `og:image` and localized `og:image:alt`.

## Files changed

| File                                        | Change                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `apps/web/src/dev/og.astro`                 | added: OG canvas page (tokens only, latin and latin-ext fonts via `<Font>`)           |
| `apps/web/integrations/dev-showcase.ts`     | modified: injects `/__og/[locale]` under `astro dev` only                             |
| `tools/og/render-og.ts`                     | added: generator                                                                      |
| `apps/web/public/og/og-en.png`, `og-pl.png` | added: generated images (94 KB, 100 KB)                                               |
| `apps/web/src/components/seo/Seo.astro`     | modified: `og:image`, `og:image:width/height/alt`, `twitter:card=summary_large_image` |
| `apps/web/src/i18n/messages/seo.ts`         | modified: `og` block (subtitle, domain, alt) EN and PL; `SeoKey` now excludes `og`    |
| `package.json`                              | modified: `og:generate` script                                                        |

## Acceptance criteria

| #    | Criterion (short)                 | Status | Evidence                                                                                                                                         |
| ---- | --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | 1200×630, under 300 KB, legible   | PASS   | Generator clips to 1200×630 and fails above 300 KB; output 94366 and 99877 bytes. Images viewed: `apps/web/public/og/og-en.png`, `og-pl.png`.    |
| AC-2 | `/__og/en` absent from production | PASS   | Route injected only when `command === 'dev'`; `find apps/web/dist -ipath "*__og*"` returns nothing.                                              |
| AC-3 | absolute image URL in built pages | PASS   | With `PUBLIC_SITE_URL=https://jakublobos.com`: `index.html` has `og:image` = `https://jakublobos.com/og/og-en.png`, `pl.html` = `.../og-pl.png`. |
| AC-4 | deterministic regeneration        | PASS   | `pnpm og:generate` run three times; `cmp` identical, and `git status` shows the committed PNGs unchanged after the last run.                     |

## Validation output

```
$ PUBLIC_SITE_URL=https://jakublobos.com pnpm verify   -> exit 0
contracts 153 passed · server 340 passed · web 255 passed · astro check 0 errors · 6 pages built
$ pnpm og:generate
og-en.png 94366 bytes
og-pl.png 99877 bytes
```

## Tests added

None. The spec requires none beyond the criteria above; the generator itself enforces size and font-load checks and fails loudly.

## Assumptions

- Subtitle, domain and alt text live in `seo.ts` (`og`), since the spec's subtitle ("React & TypeScript") differs from the hero's lowercase tech words. PL alt/subtitle are drafts for owner review.
- Astro's i18n routing answers `/__og/en` with HTTP 404 (default locale is unprefixed) while still rendering the page, so the generator waits for the port instead of an OK status and ignores the status.
- The Astro dev toolbar is hidden in the screenshot by the generator (not in the page).
- `og:image` URL uses `Astro.site`, so builds without `PUBLIC_SITE_URL` get the localhost origin (as for canonical).

## Deviations from spec or design

- Headline and subtitle sizes are token-derived multiples (`calc(var(--text-display) * 1.3)` etc.) for thumbnail legibility; no new tokens.

## Change Requests

None.

## Open issues and follow-ups

- Regenerate with `pnpm og:generate` whenever hero copy, mascot or drips change.
- `tools/og` is covered by eslint but not by the root `typecheck` (as with `tools/design`); `tsc -p tools/tsconfig.json` is clean.
