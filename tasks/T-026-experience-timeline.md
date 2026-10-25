# T-026: Experience section (scroll-driven sticky timeline)

|                          |                                  |
| ------------------------ | -------------------------------- |
| **Wave**                 | 4                                |
| **Depends on**           | T-021, T-022                     |
| **Blocked by decisions** | D-02 (PL content: draft)         |
| **Parallel with**        | T-023…T-025, T-027, T-028, T-031 |
| **Size**                 | L                                |
| **Requirements**         | FR-22, NFR-01, NFR-02, NFR-13    |

## Objective

Recreate the signature interaction: a sticky stage where scroll progress selects the active experience entry, with a progress rail and a cross-fading panel. It falls back to a stacked list in compact viewports and without JavaScript.

## References

- `docs/design-analysis.md` §4.8, §3 (`compact` condition)
- `docs/design/extracted/design-source.html` L132–172, L517–530, L560–589, L639–642
- Screenshots: `desktop-1440-experience-step{1,2,3}.png`, `tablet-1024-experience-step{1,2,3}.png`, `tablet-768-experience-compact.png`, `mobile-390-experience-step*.png`

## Scope

- `content/experience.ts`: the 3 entries (kind, date, org, colour paint ID, title, sub, bullets) for EN (verbatim from the design) and PL (draft; dates localized, e.g. "2023 — obecnie", "paź 2023 — lut 2027").
- `sections/Experience.astro`: `SectionHeading` (01) and markup that renders the **compact layout by default** (all entries visible, meta `KIND · DATE`). This is the no-JS baseline.
- `scripts/experience-timeline.ts` (custom element `<experience-timeline>`):
  - Enhances to sticky mode when JS is on **and** the viewport isn't compact (`matchMedia` from `lib/breakpoints.ts`); re-evaluates on change.
  - Sets the wrapper height `(n×80+20)vh` and the sticky stage via `data-mode="sticky"` + `style.setProperty('--exp-count', n)`.
  - Computes `p` and `active` with `lib/timeline.ts`; updates rail fill, dots, entry ink, and panel state via `data-active`/`data-position` (before, active, after).
  - Rail entries are `<button>`s with `aria-controls` → panel ID and `aria-current="step"` on the active one. Clicking scrolls to the entry's target (`lib/timeline.ts`).
  - rAF-throttled passive scroll listener. Cleanup on disconnect.
- `lib/timeline.ts`: `progress(rectTop, rectHeight, viewportH)`, `activeIndex(p, n)`, `fillFraction(active, n)`, `scrollTargetFor(i, n, sectionTop, sectionHeight, viewportH)`. Pure and unit-tested.
- Uses `lib/breakpoints.ts` (created by T-021) for the compact-mode query; do not modify it.
- `messages/experience.ts` (heading, eyebrow, kind labels).

## Allowed files

`apps/web/src/components/sections/Experience.astro`, `apps/web/src/scripts/experience-timeline.ts`, `apps/web/src/lib/timeline.ts` (+ test), `apps/web/src/content/experience.ts`, `apps/web/src/i18n/messages/experience.ts`.

## Implementation notes

- Inactive panels stay in the accessibility tree (static text). Visually they're `opacity: 0` with `pointer-events: none`. Don't use `display: none`; the panels share one grid cell so height stays stable.
- Transitions: panel 350 ms, dot 200 ms, fill 80 ms linear. Under reduced motion, switch instantly.
- Anchor `#experience` must land at the section top.

## Acceptance criteria

- **AC-1** At 1440×900 and 1024×768, scrolling through the section shows steps 1→2→3 matching the step screenshots (rail fill 0 / 50 / 100 %, dot states, ink colours, panel content and offset).
- **AC-2** At 768×1024 and 390×844 (compact), all entries are stacked as in `tablet-768-experience-compact.png`. Resizing across the threshold switches mode without a broken layout.
- **AC-3** With JS disabled, the compact layout renders with all content.
- **AC-4** Keyboard: rail buttons are focusable. Enter or Space scrolls to that step and the panel updates. Focus is visible.
- **AC-5** `lib/timeline.ts` is ≥ 90 % covered, including boundaries (`p = 0`, `p = 1`, `n = 1`).

## Validation

```
pnpm verify
pnpm preview   # manual scroll check at 1440x900, 1024x768, 768x1024, 390x844
```

## Definition of done

Standard DoD plus screenshots per step and viewport, and the PL content list.
