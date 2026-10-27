# T-060: Hero entrance animation ("the page is a sheet of paper")

- **Wave:** 7 (motion) · **Size:** M · **Depends on:** T-024 (done)
- **Owner decision:** the owner asked for richer motion on 2026-10-27 (orchestrator records it as D-30 in `open-questions.md`). Motion is an approved addition; layout, colours and typography stay as designed.

## Goal

When the home page loads, the hero should look as if it is being put onto a sheet of paper: stuck on, inked, drawn and marked, rather than appearing all at once. It should feel crafted and unusual, but it must stay quick and quiet. Every element ends exactly where the design places it today.

## Direction (implement this; small timing tweaks are yours)

A single orchestrated sequence, CSS only, total ≤ ~1.4 s, with the first element moving at 0 ms:

1. **Mascot = sticker being stuck on.** Starts slightly larger and rotated, as if lifted off the page (e.g. `scale(1.12) rotate(-8deg)`, a lifted hard shadow if the mascot has one), then presses down and settles with `--ease-spring`.
2. **Headline = ink written onto the paper.** A left-to-right reveal (`clip-path: inset(0 100% 0 0)` → `inset(0)`) with a small `translateY`. **Do not start the `h1` at `opacity: 0`**: it is the LCP candidate and an invisible start delays LCP.
3. **Intro paragraph** settles in just after the headline (short translate + fade).
4. **"figma" marker = highlighter swipe.** The pink `Highlight` band draws left to right after the intro appears. Scope it to the hero (`.intro :global(...)`). `Highlight` is used elsewhere, so don't change its default behaviour.
5. **Divider = pen line.** `scaleX(0)` → `1` from the centre.
6. **Buttons = placed onto the paper.** Each drops in with a slight stagger and lands on its hard shadow (lifted, then pressed to rest), ending in today's exact resting state. Hover and press must keep working after the animation (avoid `animation-fill-mode` values that pin `transform` and break the button's own hover/active transforms. Animate a wrapper, or use `fill-mode: backwards`).

## Constraints

- **CSS only**, inside `@media (prefers-reduced-motion: no-preference)`. With reduced motion or no JS, the hero renders statically exactly as today. Forced colours are unaffected.
- No `style=""` attributes, no `define:vars`, no JS for this task.
- Animate only `transform`, `opacity`, `clip-path` and `background-size`/`background-position` (for the highlighter): compositor-friendly, no layout shift (CLS must stay 0).
- Use tokens. You **may** add motion tokens to `apps/web/src/styles/tokens.css` (e.g. an entrance duration/stagger, a `--ease-out` curve) and document them in `docs/design-system.md` §2.8. Hero-only keyframes live in the `Hero.astro` `<style>` block with a `hero-` prefix; put a keyframe in `styles/keyframes.css` only if it is genuinely generic. Don't edit the `type-in`, `brush`, `spin` or `marquee-*` keyframes.
- **Do not touch** the resume `<Button variant="secondary" …>` line in `Hero.astro` and don't add a `<script>` there (a parallel task, T-062, adds `data-confetti` to that line and a script import). Wrapping the buttons in an element is fine if you need it, but prefer animating `.actions > *` without changing markup.
- The animation runs once per page load and doesn't replay on scroll.

## Allowed files

`apps/web/src/components/sections/Hero.astro`, `apps/web/src/components/decor/Mascot.astro` (only if the mascot needs a hook for the sticker motion; its pupil-follow and blink must keep working: animate a wrapper, not the elements those scripts transform), `apps/web/src/styles/tokens.css`, `apps/web/src/styles/keyframes.css`, `apps/web/src/styles/motion/hero.css` (hero keyframes, added in round 3), `docs/design-system.md` (§2.8 only), `tasks/T-060-hero-entrance.md` (commit this spec), `tasks/reports/T-060/**`.

## Acceptance criteria

1. On load (motion allowed), the sequence plays as described and ends pixel-identical to the current static hero.
2. With `prefers-reduced-motion: reduce`, nothing animates and nothing is hidden at any time.
3. The mascot's pointer tracking and blink still work during and after the entrance; button hover and press still work after it.
4. `pnpm verify` is green (it includes `check:budgets`). No new JS.
5. No CLS. The `h1` is visible (not `opacity: 0`) from the first frame.

## Validation

- `pnpm verify`.
- Visual check: `pnpm --filter @portfolio/web exec astro dev --port 4401` (**use port 4401 only**; other agents use 3000/4321/4402, and the host is memory-tight, so stop the server when done and kill only PIDs you started). Capture with a throwaway Playwright script outside the repo (or not committed): frames at roughly 0/300/700/1500 ms at 390 and 1440 px, plus a final-state screenshot with `reducedMotion: 'reduce'`. Mention the paths in the report.
- Don't run `pnpm test:e2e` (CI runs it on the PR; ports are shared).
- Tests: none needed (pure CSS). Don't add tests for the sake of it.
