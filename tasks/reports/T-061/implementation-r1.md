# T-061 implementation report (round 1)

## What changed

- `MobileMenu.astro`: the sheet unrolls via `clip-path: inset(0 0 100% 0)` to `inset(0)`, using `@starting-style` plus `transition` on `display` and `overlay` (`allow-discrete`). Open takes `--duration-panel` (350ms), close 65% of that. Links, then the bottom row, enter with a `menu-in` keyframe (translateY plus 2deg rotate, `--ease-type`), staggered in `--duration-press` steps via `:nth-child`. Entrance only, so on close the links stay put under the retracting sheet. `mobile-menu.ts` is unchanged: the `close` handler (focus, scroll lock, `aria-expanded`) still fires synchronously, so link navigation is not delayed.
- `GuestbookModal.astro`: the backdrop fades; the card is set down from `translateY`, `rotate(-1.5deg)` and `scale(.96)` with `--ease-spring`; the exit is a quick fade and drop (`--duration-state`). Same `display`/`overlay` technique. `.modal` now has explicit `position: fixed; inset: 0` (it is no longer `:modal` during the exit) and `overflow-x: hidden` (rotation or nudge must not flash a scrollbar).
- `guestbook-form.ts`: `render()` re-inks eyebrow, title and copy with WAAPI (old fades and lifts out, text is written, new rises in). Card accents: approved settle (scale/rotate bounce), rejected and superseded 2-3 cycle horizontal nudge. `slow` has no accent. The live region and `data-state` update synchronously.
- No change to `lib/guestbook-status.ts`, `tokens.css` or `keyframes.css`; no new tests (no new pure logic).

## Decisions

- All CSS motion sits in `@media (prefers-reduced-motion: no-preference)`, so reduced motion keeps today's instant behaviour. JS skips WAAPI when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
- Re-ink runs only when the dialog is open and the state actually changes, so opening the dialog (`render(null)` before `showModal`) and quiet resumes never animate.
- A newer render cancels in-flight animations; the rejected `finished` promise signals that the newer render owns the text. Animations are cancelled on disconnect (the form's AbortSignal), not on dialog close, which would drop the pending text write.
- Selectors use `:modal` rather than `[open]` (the repo's astro lint rule rejects runtime-only attributes).
- WAAPI constants hard-code 150ms and the `--ease-type` curve because `var()` is not accepted there; commented in the file.
- Skipped the optional hamburger morph and CheckIcon pop.

## Browser support

Chromium and WebKit: animated open and close, verified with screenshots. Firefox: not run here. It should open animated; where `overlay` is unsupported the exit is instant, per spec. The menu is `pointer-events: none` while exiting.

## Evidence

`pnpm verify` exit 0: contracts 153, server 412, web 342 tests passed; budgets OK (critical JS 14.5/35 KB, CSS 12.0/25 KB).

Frames from a throwaway Playwright script (not committed), Chromium `cr-` and WebKit `wk-` prefixes, in
`C:\Users\saltv\AppData\Local\Temp\claude\C--Users-saltv-Desktop-Development-jakublobos-com\eea5b481-eb7c-490f-b318-9d1690dd0821\scratchpad\T-061-shots\`:
`*-menu-open-*` and `*-menu-close-*` at 390px; `*-modal-approved-390-*` and `*-modal-rejected-1440-*` (open-1..3, checking, state-1..4, settled, close-1..2). A link click closes the menu and lands on `#projects` (scrollY 2588) in both engines; both dialogs are hidden after closing.

Ports 3000/4321 were already held by another dev server serving the main checkout, so I ran `astro dev --port 4455` from this worktree and stubbed the guestbook API with `page.route` (approved and rejected outcomes). I then killed it (only my PID).

## Risks for e2e

The menu, modal, guestbook and consent specs all run with `reducedMotion: 'reduce'`, which skips every transition and WAAPI call, so no click can land mid-exit and axe sees final colours. `motion.spec.ts` uses no-preference but does not open these dialogs. I did not run e2e (instructed). Under no-preference, an axe run during the 350ms entrance could see translucent contrast.
