# T-065 implementation report, round 1

## Changed files

- `apps/web/src/i18n/messages/hero.ts`: `title` EN "Engineering with the user relationship in mind", PL "Inżynieria z myślą o relacji z użytkownikiem".
- `apps/web/src/i18n/messages/seo.ts`: `og.alt` quote updated in both locales (nothing else in the file).
- `docs/content/pl-copy-review.md`: hero `title` row and `og.alt` row.
- `apps/web/public/og/og-en.png`, `apps/web/public/og/og-pl.png`: regenerated.
- `tasks/T-065-hero-headline.md`: spec committed (run through Prettier, which `format:check` requires; content unchanged).
- `tasks/reports/T-065/**`: this report and 6 screenshots.

No test or e2e spec asserted the old headline (`grep` for "Software Engineer!" / "Software Engineerem" in `apps/web` found only copy, SEO and content sources), so no test changes. No new tests.

## Layout check (built site, `astro preview` on port 4405, Chromium, settled state after 2.5 s)

`<html>` `scrollWidth` / `clientWidth`, and `h1` `scrollWidth` / `clientWidth`:

| Locale  | 390     | 768     | 1024      | 1440      |
| ------- | ------- | ------- | --------- | --------- |
| EN html | 390/390 | 768/768 | 1024/1024 | 1440/1440 |
| PL html | 390/390 | 768/768 | 1024/1024 | 1440/1440 |
| EN h1   | 350/350 | 691/691 | 877/877   | 856/856   |
| PL h1   | 354/354 | 691/691 | 877/877   | 856/856   |

No horizontal overflow anywhere; "użytkownikiem" fits at 390 px (3 balanced lines). The headline wraps to 3 lines at 390 and 1440 px, 2 at 768 and 1024. Mascot and buttons keep their positions. The mid-animation frame at 1440 px (`en-1440-mid.png`) shows the ink clip reveal across all three lines, and the settled frame shows descenders ("g", "p") and doodle glyphs fully visible, so the T-060 negative insets (`-0.3em`) are sufficient for the multi-line headline.

Screenshots in `tasks/reports/T-065/screenshots/`: `en-390.png`, `en-1440.png`, `en-1440-mid.png`, `pl-390.png`, `pl-768.png`, `pl-1440.png`.

## OG regeneration

`pnpm og:generate` (picks a free random port, never 3000/4321): `og-en.png` 131289 bytes, `og-pl.png` 135375 bytes (under the 300 KB cap). Both viewed: the headline wraps to 3 balanced lines, fully inside the 1200 × 630 card, no clipping, subtitle and domain unobstructed. No change to `dev/og.astro` was needed.

## CSS changes

None. `Hero.astro`, `styles/motion/hero.css` and `dev/og.astro` are untouched; `text-wrap: balance` already handles the longer line.

## `pnpm verify`

Green end to end (format:check, lint, typecheck, test, build, check:budgets). Tests: contracts 153, server 412, web 344 passed. Budgets OK (critical JS 15.7/35 KB, CSS 12.3/25 KB). The first run failed `format:check` on the unformatted spec file; fixed with Prettier and re-run green.

## Acceptance criteria

1. EN `/` and PL `/pl` render the new text (h1 text captured by Playwright above).
2. No overflow or clipping at the four widths, either locale; entrance reveals the full headline (screenshots).
3. OG images regenerated and visually checked; `og.alt` matches.
4. `pnpm verify` green.

## Owner review needed

- The EN headline "Engineering with the user relationship in mind" is the orchestrator's translation of the owner's PL line; the PL string is the owner's own. Both rows in `docs/content/pl-copy-review.md` have an empty review column for sign-off.

## Open issues

- The hero `h1` now reads differently from the unchanged SEO `title`/`description`/`og.subtitle`/`profile.role` ("Software Engineer"), per the task scope.
- `pnpm test:e2e` was not run (host constraint).
