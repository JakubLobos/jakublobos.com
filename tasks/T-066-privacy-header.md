# T-066: Privacy page header must stay transparent on desktop after scroll

- **Wave:** 7 (fix) · **Size:** S · **Depends on:** T-023, T-037 (done)
- **Owner report (2026-10-27):** on `/privacy` (and presumably `/pl/privacy`), on **desktop**, the site header takes on a different background colour or blur after scrolling. On normal pages (`/`) it doesn't, which matches the design: per D-16, the translucent background with blur applies **only on mobile** (`width < 760px`). Mobile is fine and must keep its behaviour.

## What the orchestrator verified (not the cause)

- `components/site/Header.astro`: the scroll script toggles `[data-scrolled]` on every page, but the background, border and `backdrop-filter` rules live inside `@media (width < 760px)`. On paper, desktop gets no background.
- `components/pages/PrivacyPage.astro` styles its own `<header>` (inside `.policy`) with component-scoped CSS, so on paper it doesn't leak to the site header.

So the cause is somewhere else. **Reproduce it first** in a real browser on the built site at 1280 and 1440 px: scroll `/privacy` and `/`, and compare the site header's computed `background-color`, `backdrop-filter`, `border-bottom-color` and `box-shadow` before and after scrolling. Also compare what is visually behind it. Candidates to rule in or out:

- a global or leaked selector matching `header` or `[data-scrolled]` (check the built CSS in `dist/`, not just the sources, including Astro's scoping strategy);
- a different stacking or `z-index` context on the privacy page;
- privacy content (e.g. `.table-scroll` with `--color-surface`, sticky elements) showing through the transparent header in a way that reads as a header background;
- a privacy-only layout difference;
- anything else you find.

Name the root cause with evidence (the computed styles or the offending rule) in the report.

## Fix

- Fix the root cause with the smallest correct change. On desktop, the header after scrolling on `/privacy` must look exactly as on `/` (transparent, as designed). Mobile (`< 760px`) keeps the D-16 translucent and blurred header on every page, privacy included.
- If the cause is content showing through a transparent header (the design's intended look), **stop and report** with screenshots instead of inventing a new header style: that is a design decision for the owner.
- Tokens only; component-scoped styles (ADR-0008); no new dependencies.

## Allowed files

`apps/web/src/components/site/Header.astro`, `apps/web/src/components/pages/PrivacyPage.astro`, any other file **only** if it is the proven root cause (name it in the report), `tasks/T-066-privacy-header.md` (commit this spec), `tasks/reports/T-066/**`.

## Acceptance criteria

1. Desktop (1280 and 1440 px), `/privacy` and `/pl/privacy`: after scrolling, the header's computed `background-color` is transparent and `backdrop-filter` is `none`, the same as on `/`.
2. Mobile (390 px): after scrolling, the header is still translucent and blurred on `/` and `/privacy`.
3. `pnpm verify` green.

## Validation

- `pnpm verify`.
- Throwaway Playwright script (not committed): `pnpm --filter @portfolio/web build` + `pnpm --filter @portfolio/web exec astro preview --port 4406`. **Port 4406 only**: the owner runs `pnpm dev` on 3000/4321, so never touch those; kill only PIDs you started.
  - Log the computed styles before and after scrolling for `/`, `/privacy` and `/pl/privacy` at 390, 1280 and 1440 px.
  - Take before and after screenshots of the header area on `/privacy` at 1440 and 390 (max 4 PNGs in `tasks/reports/T-066/screenshots/`).
- Don't run `pnpm test:e2e`. No new tests.
