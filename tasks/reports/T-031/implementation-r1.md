# T-031: Implementation report, round 1

- **Branch:** `task/T-031-scrollbar` (based on current `main`)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

`<sketch-scrollbar>` is a decorative custom element rendered by `CustomScrollbar.astro`. All geometry lives in the pure `lib/scrollbar.ts`; `scripts/custom-scrollbar.ts` only wires events (rAF-throttled passive scroll/resize, `ResizeObserver` on `body`, pointer-captured drag, track click) and writes `--thumb-h/-y/-r` through `style.setProperty`. Native scrolling is untouched; the element is `aria-hidden`, has no focusable descendants, and hides itself (`data-hidden`) when the page isn't scrollable.

## Files changed

| File                                                  | Change                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/web/src/components/site/CustomScrollbar.astro`  | modified (was stub): markup, scoped styles, hidden < 760 px, forced colours |
| `apps/web/src/scripts/custom-scrollbar.ts`            | added: `<sketch-scrollbar>` element                                         |
| `apps/web/src/lib/scrollbar.ts` / `scrollbar.test.ts` | added: `thumbMetrics`, `scrollForThumbDrag`, `scrollForTrackClick` + tests  |
| `tasks/reports/T-031/`                                | added: report and screenshots                                               |

## Acceptance criteria

| #    | Criterion (short)                                 | Status                | Evidence                                                                                                                                                                                                                                                                                                      |
| ---- | ------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Visual parity; absent at 390                      | yes                   | Geometry/tokens copied from design-source L72-81; `screenshots/scrollbar-1440-*.png`, `-1024-*.png`. At 390 computed `display: none`. Current page only scrolls ~450 px (other sections are stubs), so thumbs are long; shape/shadow/caps/grips visible in `scrollbar-1440-drag.png` (yellow while dragging). |
| AC-2 | Exact top/bottom, 1:1 drag, track click           | yes                   | Unit tests in `scrollbar.test.ts`. In Chrome at 1440: top thumb y=14 (track top), bottom thumb bottom=886 (track bottom); dragging the thumb 100 px gave scrollY 155 = 100 x 449/290.2; track click near the bottom end scrolled to max (449).                                                                |
| AC-3 | Native scrolling, not focusable, not in a11y tree | yes                   | `aria-hidden="true"`, no `tabindex/a/button` inside (checked in page), no key/wheel/touch handlers, listeners are passive. `user-select` and `data-dragging` cleared after release (checked).                                                                                                                 |
| AC-4 | rAF-throttled handlers                            | yes (by construction) | Scroll, resize, `ResizeObserver` and drag moves all funnel into one `requestAnimationFrame`; drag moves only store `clientY`. **No Performance panel trace was taken** (headless CDP only); a reviewer may want one.                                                                                          |

## Validation output

```
$ pnpm verify
prettier --check: All matched files use Prettier code style!
eslint: clean; astro check: 0 errors (typecheck and build)
tests: contracts 153, server 340, web 201 passed (14 files)
build: 6 pages built, Complete!
```

## Tests added

- `apps/web/src/lib/scrollbar.test.ts`: thumb at 0 and at max scroll, proportional size, 56 px minimum and full-track cap, overscroll clamp, wobble, scrollable threshold; drag maps full travel to full scroll, clamps, no-travel case; track click centring, end clamping.
- The element itself is not unit-tested (DOM, no jsdom in the project); it was exercised in headless Chrome (drag, click, hidden at 390).

## Screenshots (UI tasks)

`tasks/reports/T-031/screenshots/scrollbar-{1440,1024,390}-{top,bottom}.png` and `scrollbar-1440-drag.png`. 768 not taken (below 760 is hidden, 768 behaves like 1024).

## Assumptions

- `TRACK_INSET = 14` in `lib/scrollbar.ts` mirrors `--space-14` in CSS (same pattern as `breakpoints.ts`); the 760 px query repeats `breakpoints.mobile`.
- Track-click offset is measured from the track's `getBoundingClientRect().top`, so it stays correct if the inset changes.
- Under `forced-colors` the thumb uses `Canvas`/`CanvasText` and `Highlight`/`HighlightText` on hover/drag.
- Small local dimensions (18/16/12 px, 3 px grip gap, grip widths) have no tokens; kept as component-local values, all colours, radii, shadow, borders, z-index and motion use tokens.

## Deviations from spec or design

- Drag/click scroll targets are clamped to `[0, max]` (the original did not clamp thumb drag).

## Change Requests

- None.

## Open issues and follow-ups

- Re-check parity against the design screenshots once the full page height exists (later tasks), since the thumb length is currently large.
- No Performance panel trace (see AC-4).
