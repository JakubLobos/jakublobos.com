# T-060 implementation report (round 1)

## What changed

- `Hero.astro`: mascot wrapped in `.sticker` (animating the wrapper leaves `hero-mascot`'s hover transform and `mascot.ts` untouched). CSS-only entrance inside `prefers-reduced-motion: no-preference`: sticker press-down (spring), h1 left-to-right `clip-path` ink reveal (never `opacity: 0`), intro settle, `figma` highlighter swipe via `background-size` (scoped `.intro :global(.hl)`, `Highlight` unchanged), divider `scaleX` draw, buttons dropped in with stagger. Keyframes are `hero-*`, local to the hero.
- `tokens.css` and `design-system.md` §2.8: added `--duration-enter` (450ms), `--duration-ink` (700ms), `--stagger-enter` (90ms), `--ease-out`.
- Spec committed at `tasks/T-060-hero-entrance.md`. The resume `<Button>` line is untouched; no script added.

## Decisions

- All animations use `backwards` fill, so nothing is pinned afterwards: button hover/active and mascot hover keep working. The timeline ends at about 1.26 s (last button delay 810 ms + 450 ms).
- The lifted hard shadow was skipped: the mascot has none, and animating `box-shadow` is not compositor-only. Buttons "land" through transform and opacity only.
- Only transform, opacity, clip-path and background-size are animated, so there is no layout shift.

## Evidence

`pnpm verify`: green (prettier, eslint, typecheck, tests, build). Tail: `Budgets OK.` (index CSS 11.9 / 25.0 KB, JS 14.2 / 35.0 KB).

Screenshots (not committed), in the session scratchpad `...\scratchpad\t060\`: `{390,1440}-no-preference-{0,300,700,1500}.png` and `{390,1440}-reduce-1600.png`. The 1440 final frame (1500 ms) matches the reduced-motion static frame.

## Risks

- Early frames were captured late (slow dev server), so mid-sequence timing was judged from the CSS rather than frame by frame.
- Wrapping the mascot adds one `div`; layout is identical in screenshots.
