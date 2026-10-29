# T-024: Implementation report, round 1

- **Branch:** `task/T-024-hero` @ `0143151` (round 1 final; review fixups are in `implementation-r2.md`)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Filled the T-021 stubs: `Hero` (mascot, display `h1`, intro with tech words and `Highlight`, divider, two `Button` CTAs), `Mascot` (`<hero-mascot>` with CSS-drawn shapes), and `DecorLayer` (top and bottom `PaintDrips`). Pupil tracking and blinking live in `scripts/mascot.ts` on top of pure maths in `lib/pupil.ts`; the top-drip parallax is `scripts/drips-parallax.ts`. All motion is off under reduced motion; the mascot is hidden in forced colours. `components/pages/*` and `BaseLayout` are untouched.

## Files changed

| File                                            | Change                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/web/src/components/sections/Hero.astro`   | modified: hero markup and styles                                                            |
| `apps/web/src/components/decor/Mascot.astro`    | added: mascot shapes, hover lift, forced-colours hide, loads `mascot.ts`                    |
| `apps/web/src/components/site/DecorLayer.astro` | modified: top and bottom drips, loads `drips-parallax.ts`                                   |
| `apps/web/src/scripts/mascot.ts`                | added: `<hero-mascot>` (pointer tracking, blink, visibility, media-query handling, cleanup) |
| `apps/web/src/scripts/drips-parallax.ts`        | added: top-drip translateY                                                                  |
| `apps/web/src/lib/pupil.ts`, `pupil.test.ts`    | added: `pupilOffset`, `blinkDelay` and their tests                                          |
| `apps/web/src/i18n/messages/hero.ts`            | added: EN + PL copy                                                                         |
| `apps/web/src/components/ui/Button.astro`       | modified (CR-1): `download` and `mimeType` props for links                                  |
| `apps/web/src/styles/tokens.css`                | modified (CR-2): intro and divider layout tokens                                            |

## Acceptance criteria

| #    | Criterion (short)                           | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                              |
| ---- | ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Visual parity at 1440 and 390               | PASS   | `screenshots/hero-1440.png`, `hero-390.png` (reduced motion, pointer idle) vs `docs/design/screenshots/desktop-1440-hero.png`, `mobile-390-hero.png`. Mascot-to-h1, h1-to-intro, intro-to-CTA distances match at 1440 (150/185/140 px); h1 x-extent identical (462-976). Differences: tech words use the approved darker `--color-tech` (D-01); header/aside/marquee are other tasks. |
| AC-2 | Pupils fine-pointer only, max 7 px; blink   | PASS   | `lib/pupil.test.ts` (offset clamp at 7 px, direction, zero; `blinkDelay` 2000 ms first, 2500-6000 ms with injected RNG). Browser run (headless Edge, CDP): far pointer gave pupil offsets (6.44, -2.73) and (6.39, -2.87), a 7.0 px length; first blink observed with `getAnimations()`.                                                                                              |
| AC-3 | Top drips -180 px max; bottom drips at end  | PASS   | Browser run: scrollY 302 on an 886.9 px `#experience` top gave `translateY(-61.29px)` = 302/886.9 x 180. The cap is `Math.min(1, ...)`; the stub page was too short to reach it. Bottom drips rect right/bottom equals the `.page` right/bottom (1440 / 1202.4); `--z-drips` 1 sits under `main` 2.                                                                                   |
| AC-4 | `min-height: calc(100svh - 240px)`; CLS ~ 0 | PASS   | Computed min-height 660 px at a 900 px viewport = hero height. `PerformanceObserver` layout-shift sum on a cold load of `/`: 0.00024 (dev server, whole page).                                                                                                                                                                                                                        |
| AC-5 | Single `h1`; mascot and drips aria-hidden   | PASS   | Browser run: `h1` count 1; `hero-mascot[aria-hidden=true]`; `#decor-layer[aria-hidden=true]`.                                                                                                                                                                                                                                                                                         |

Reduced motion (emulated `prefers-reduced-motion: reduce`, same run): pupils got no `--pupil-*`, drips no transform, no running animations after 3 s.

## Validation output

```
$ pnpm verify
exit=0   (format:check, lint, typecheck: 0 errors / 0 warnings / 0 hints, test: apps/web 7 files / 108 tests passed, build: 6 pages)
$ dist/index.html: style=" attributes: 0; script tags are CSP-hashed modules
$ pnpm preview  -> no such script yet (arrives with T-016); not run
```

## Tests added

- `apps/web/src/lib/pupil.test.ts`: zero distance, near-pointer proportionality, diagonal direction, clamp at 7 px for far distances, first-blink delay, delay bounds with an injected RNG. Markup and the custom element are not unit-tested (owner's instruction); behaviour was checked in a real browser as above.

## Screenshots

`tasks/reports/T-024/screenshots/hero-{1440,1024,768,390}.png` (EN, reduced motion) and `hero-pl-1440.png`. The stub header/skip-link text at the top is T-023's region and is ignored.

## Assumptions

- **PL copy (drafts for owner review):**
  - Headline: `Jestem Frontend Developerem!`
  - Intro: `Tworzę aplikacje webowe głównie w react i typescript` / `Projektuję aplikacje webowe w figmie`
  - CTAs: `Napisz do mnie` and `Pobierz moje CV`
- **latin-ext preload (T-021 open item): not needed for the hero.** The PL headline uses basic Latin only (no ą ć ę ł ń ś ź ż), so the preloaded `latin` subset covers it. PL section `h2`s such as "Doświadczenie" use the display font with latin-ext glyphs, which load on demand below the fold. Keep any future above-the-fold PL display text free of those letters, or add `latin-ext` to the preload. No CR raised.
- The blink animates the individual `scale` property, not `transform`, so each eye keeps its -4deg/5deg tilt (the prototype's `transform` keyframes drop the tilt for 180 ms).
- `lib/pupil.ts` also holds the blink-delay maths, since the allowed files allow no other `lib` module. The drips parallax formula is two lines inside its script and is not unit-tested.
- Forced colours hides the mascot (`display: none`); under reduced motion it stays visible and static.
- The `figma` highlight uses the `Highlight` default (`--hl-start/--hl-end` 55/92 %, the approved token values rather than the prototype's 55/90 %).

## Deviations from spec or design

- None remaining: the resume link renders `download` and `type="application/pdf"` through the new Button props (CR-1), and the intro and divider measures are tokens (CR-2).

## Change Requests

- **CR-1 (`apps/web/src/components/ui/Button.astro`, T-022): accepted and applied.** Added `download?: boolean | string` and `mimeType?: string` (rendered as the link's `type`; the button `type` prop is unchanged). Both apply only when `href` is set. `Hero` uses `download mimeType="application/pdf"`.
- **CR-2 (`tokens.css`): accepted and applied.** Added `--measure-intro: 560px` and `--divider-w: 40px`; `Hero.astro` uses them. (Renamed in round 2, R1-05.)

## Open issues and follow-ups

- `pnpm preview` unavailable until T-016; production-topology check not done.
- Resume PDFs (`/resume/jakub-lobos-cv-{en,pl}.pdf`) do not exist yet (D-10, release item); the link 404s until then.
- The -180 px top-drip cap was verified by formula and a partial scroll only, because the stub page is not tall enough to reach `#experience`; re-check once T-026 lands.
- Pupil tracking does not update on scroll without pointer movement (same as the prototype).
