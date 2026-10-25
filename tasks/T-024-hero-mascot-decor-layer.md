# T-024: Hero section, mascot, and paint-drip decor layer

|                          |                                                                        |
| ------------------------ | ---------------------------------------------------------------------- |
| **Wave**                 | 4                                                                      |
| **Depends on**           | T-021, T-022                                                           |
| **Blocked by decisions** | D-10 (resume PDFs: link to the agreed paths; files are a release item) |
| **Parallel with**        | T-023, T-025…T-028, T-031                                              |
| **Size**                 | M                                                                      |
| **Requirements**         | FR-14, FR-20, NFR-01, NFR-02, NFR-03                                   |

## Objective

Recreate the hero exactly: the CSS-drawn mascot with pointer-tracking pupils and blinking, the headline, intro highlights, and CTAs. Also build the fixed top and bottom paint drips with their scroll parallax.

## References

- `docs/design-analysis.md` §4.5, §4.6
- `docs/design/extracted/design-source.html` L54–63, L85–112, L309–318, L449–462, L520–527, L629
- Screenshots: `desktop-1440-hero.png`, `tablet-768-hero.png`, `mobile-390-hero.png`, `desktop-1440-footer.png` (bottom drips)
- `docs/design-system.md` §3 rule 1 (illustration geometry exception)

## Scope

- `sections/Hero.astro`: mascot, `<h1>` (display), intro paragraph with `Highlight` (figma) and tech-coloured words, divider, CTAs (`Button primary` → `#contact`; `Button secondary` → `profile.resume[locale]`, `download` attribute, `type="application/pdf"`).
- `decor/Mascot.astro`: all shapes per §4.6 as absolutely positioned elements with local geometry custom properties; `aria-hidden`; hover lift via CSS.
- `scripts/mascot.ts` (custom element `<hero-mascot>`):
  - pupils follow the pointer **only** for `(pointer: fine)`, rAF-throttled, using `lib/pupil.ts` (max 7 px, distance/25)
  - blink with Web Animations (180 ms; first at 2 s, then 2.5–6 s random via an injectable RNG)
  - all motion disabled under reduced motion
  - stops when the tab is hidden (`visibilitychange`)
- `site/DecorLayer.astro`: top drips (fixed, `--drips-left`) and bottom drips (absolute bottom-right of the wrapper; scale .6 below 760 px).
- `scripts/drips-parallax.ts`: translateY of the top drips = `-min(1, scrollY / experienceTop) × 180px`, rAF-throttled, via `style.setProperty`. Static under reduced motion.
- `messages/hero.ts` (EN + PL draft).

## Allowed files

`apps/web/src/components/sections/Hero.astro`, `apps/web/src/components/decor/Mascot.astro`, `apps/web/src/components/site/DecorLayer.astro`, `apps/web/src/scripts/{mascot,drips-parallax}.ts`, `apps/web/src/lib/pupil.ts` (+ test), `apps/web/src/i18n/messages/hero.ts`.

## Acceptance criteria

- **AC-1** Pixel-level visual parity of mascot, headline, intro, and CTAs at 1440 and 390 with reduced motion and the pointer centred (side-by-side in the report).
- **AC-2** Pupils track the pointer (fine pointers only) and never exceed 7 px offset (unit-tested in `lib/pupil.ts`). Blink timing is within the design's range (unit-test the scheduler with an injected RNG).
- **AC-3** Top drips move up as you scroll toward Experience and stop at −180 px. Bottom drips sit at the page's bottom-right, behind the footer content (z-order per `design-analysis.md` §2).
- **AC-4** Hero `min-height: calc(100svh - 240px)`; no layout shift on font load (verify CLS ≈ 0 in a Lighthouse or Performance panel note).
- **AC-5** `h1` is the only h1 on the page; the mascot and drips are hidden from the accessibility tree.

## Validation

```
pnpm verify
pnpm preview
```

## Definition of done

Standard DoD plus side-by-side screenshots and the PL strings list.
