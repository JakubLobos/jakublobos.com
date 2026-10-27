# T-025: Marquee bands

|                          |                                                                          |
| ------------------------ | ------------------------------------------------------------------------ |
| **Wave**                 | 4                                                                        |
| **Depends on**           | T-021, T-022                                                             |
| **Blocked by decisions** | D-11 (pause control: implement the default), D-01 (marquee colours kept) |
| **Parallel with**        | T-023, T-024, T-026…T-028, T-031                                         |
| **Size**                 | S                                                                        |
| **Requirements**         | FR-21, NFR-02                                                            |

## Objective

Build the two rotated, counter-scrolling bands exactly as designed, accessible and pausable, with CSS animation instead of the prototype's JS.

## References

- `docs/design-analysis.md` §4.7, §6 DF-4
- `docs/design/extracted/design-source.html` L114–129, L543–549, L591–595
- Screenshots: `desktop-1440-hero.png` (bottom), `desktop-1440-marquee-reduced-motion.png`, `mobile-390-hero.png`

## Scope

- `content/marquee.ts`: band A (12 tech words: identical in both locales) and band B (7 facts; EN from design, PL drafts).
- `sections/MarqueeBands.astro`:
  - full-bleed section (`aria-label` localized)
  - two bands per §4.7 (rotation, borders, padding, word and dot colour cycling)
  - list duplicated ×4 for a seamless loop
  - both bands `aria-hidden="true"`, with a visually hidden `<p>` summarizing their content
- CSS animation using `marquee-ltr`/`marquee-rtl` keyframes, 45 s linear infinite, `animation-play-state` controlled by hover and `data-paused`. No animation under reduced motion.
- `scripts/marquee.ts` (custom element): click or tap toggles `data-paused` on that band; a visually hidden, focusable `<button aria-pressed>` with a constant label "Pause animation" (`aria-pressed="true"` while paused; review R1-01) that becomes visible on focus controls both bands (D-11 default).

## Allowed files

`apps/web/src/components/sections/MarqueeBands.astro`, `apps/web/src/scripts/marquee.ts`, `apps/web/src/content/marquee.ts`, `apps/web/src/i18n/messages/marquee.ts`.

## Acceptance criteria

- **AC-1** Visual parity at 1440 and 390 with reduced motion (static positions comparable to `desktop-1440-marquee-reduced-motion.png`). Band height `clamp(160px,17vw,220px)`; the bands overlap and cross as in the design.
- **AC-2** The loop is seamless (no jump at the iteration boundary). Verify by recording or by checking that the translate distance equals exactly half the track.
- **AC-3** Hover pauses a band. Click or tap toggles it. The keyboard button pauses and resumes both and reflects `aria-pressed`.
- **AC-4** No horizontal scrollbar at any width (`overflow: hidden`, 115vw bands inside a clipped section).
- **AC-5** Screen readers get one concise text alternative, not 48 repeated items.

## Validation

```
pnpm verify
pnpm preview
```

## Definition of done

Standard DoD.
