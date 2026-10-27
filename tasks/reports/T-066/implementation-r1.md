# T-066 implementation report (round 1)

## Root cause

`apps/web/src/components/pages/PrivacyPage.astro` carried a deliberate `:global(header[data-site-header][data-scrolled])` rule inside `@media (width >= 760px)` (added in T-042, commit 7c4ce1c). `:global()` escapes Astro's scoping, so it applied to the site header from `Header.astro`: translucent `--color-bg` background plus `blur(6px)` on desktop, only when the privacy page is loaded. `Header.astro` itself was correct (D-16 rules only under `width < 760px`). The "content showing through" candidate does not apply: the computed styles prove an actual background and filter were applied.

Evidence: computed styles of `[data-site-header]` on the built site (`astro preview`, port 4406, Playwright, scrollY 0 vs 600).

## Computed styles after scrolling (background-color | backdrop-filter)

| Viewport | Page          | Before fix                                            | After fix             |
| -------- | ------------- | ----------------------------------------------------- | --------------------- |
| 1280     | `/`           | rgba(0,0,0,0) \| none                                 | rgba(0,0,0,0) \| none |
| 1280     | `/privacy`    | color(srgb .9686 .9686 .9647 / 0.9) \| blur(6px)      | rgba(0,0,0,0) \| none |
| 1280     | `/pl/privacy` | color(srgb .9686 .9686 .9647 / 0.9) \| blur(6px)      | rgba(0,0,0,0) \| none |
| 1440     | `/`           | rgba(0,0,0,0) \| none                                 | rgba(0,0,0,0) \| none |
| 1440     | `/privacy`    | color(srgb .9686 .9686 .9647 / 0.9) \| blur(6px)      | rgba(0,0,0,0) \| none |
| 1440     | `/pl/privacy` | color(srgb .9686 .9686 .9647 / 0.9) \| blur(6px)      | rgba(0,0,0,0) \| none |
| 390      | `/`           | translucent 0.9 \| blur(6px), border rgb(228,228,225) | unchanged             |
| 390      | `/privacy`    | translucent 0.9 \| blur(6px), border rgb(228,228,225) | unchanged             |
| 390      | `/pl/privacy` | translucent 0.9 \| blur(6px), border rgb(228,228,225) | unchanged             |

Before scrolling every case is transparent with `backdrop-filter: none`. `border-bottom-color` and `box-shadow` were identical on `/` and `/privacy` at all widths, before and after the fix (desktop rgb(43,43,43) / none; mobile transparent before scroll).

## Fix

Deleted the leaking rule and its comment from `PrivacyPage.astro` (only file changed besides the spec and this report). Mobile behaviour is untouched (it comes from `Header.astro`).

Trade-off for the owner: as on every other page, the transparent desktop header on `/privacy` now lets table content scroll under the nav links. That was the reason T-042 added the rule; the owner has now asked for the designed transparent look instead.

## Screenshots (`tasks/reports/T-066/screenshots/`)

- `before-1440.png`, `after-1440.png`, `before-390.png`, `after-390.png` (header area of `/privacy` scrolled 600px)

## Acceptance criteria

1. Desktop 1280/1440, `/privacy` and `/pl/privacy`: transparent, `none` after scroll. Met (table above).
2. Mobile 390: still translucent and blurred on `/` and `/privacy`. Met (table above).
3. `pnpm verify` green. See below.

## pnpm verify

Ran in this session; format:check, lint, typecheck, test, build and `check-budgets` ("Budgets OK.") completed without errors.

## Process

Preview server on port 4406 started and killed (PID 12428); no other ports touched; throwaway probe script not committed. `pnpm test:e2e` not run. No new tests (per spec).
