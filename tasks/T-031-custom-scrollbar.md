# T-031: Hand-drawn custom scrollbar

|                          |                       |
| ------------------------ | --------------------- |
| **Wave**                 | 4                     |
| **Depends on**           | T-021                 |
| **Blocked by decisions** | none                  |
| **Parallel with**        | T-023…T-028           |
| **Size**                 | S                     |
| **Requirements**         | FR-15, NFR-02, NFR-03 |

## Objective

Recreate the sketchy scrollbar that replaces the hidden native one on desktop. It must be decorative to assistive technology and must not get in the way of native scrolling.

## References

- `docs/design-analysis.md` §4.4, §6 DF-11
- `docs/design/extracted/design-source.html` L72–81, L463–488, L538, L603
- Screenshots: right edge of every `desktop-1440-*.png` (thumb position varies with scroll)

## Scope

- `site/CustomScrollbar.astro`: track (dashed line + 2 tilted caps) and thumb (sketch radius, hard shadow, 3 grip lines). `aria-hidden="true"`. Hidden below 760 px via CSS. Hidden when the page isn't scrollable (`data-hidden`).
- `scripts/custom-scrollbar.ts` (`<sketch-scrollbar>`):
  - thumb size and position via `lib/scrollbar.ts` (min 56 px; wobble `sin(p×9)×1.2deg`)
  - rAF-throttled passive scroll, `ResizeObserver` on `document.body`
  - drag with pointer capture (`touch-action: none`, temporary `user-select: none`)
  - track click → smooth scroll to the proportional position (instant under reduced motion)
  - fully cleaned up on disconnect
- `lib/scrollbar.ts` (pure): `thumbMetrics(viewportH, docH, scrollY)`, `scrollForThumbDrag(...)`, `scrollForTrackClick(...)`.

## Allowed files

`apps/web/src/components/site/CustomScrollbar.astro`, `apps/web/src/scripts/custom-scrollbar.ts`, `apps/web/src/lib/scrollbar.ts` (+ test).

## Acceptance criteria

- **AC-1** Visual parity with the design (thumb shape, shadow, track, caps) at 1440 and 1024; absent at 390.
- **AC-2** The thumb position tracks scroll exactly at the top (0) and bottom (track − thumb). Dragging maps 1:1 to the document. Clicking the track jumps correctly. Math is unit-tested at the boundaries.
- **AC-3** Keyboard, wheel, and touch scrolling are unaffected. The scrollbar is never focusable and is absent from the accessibility tree.
- **AC-4** No main-thread jank: handlers are rAF-throttled. Note a Performance panel trace while scrolling.

## Validation

```
pnpm verify
pnpm preview
```

## Definition of done

Standard DoD.
