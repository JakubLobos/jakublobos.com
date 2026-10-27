# T-060 implementation report (round 2)

## R1-01 (MAJOR): ink reveal clipped the display glyphs

Fixed. `hero-ink` now clips with negative insets (`inset(-0.3em 100% -0.3em -0.3em)` to `inset(-0.3em)`), so the clip box is larger than the doodle glyphs and swashes beyond the 1.1 line box are no longer cut during the reveal. A short comment in `Hero.astro` explains why.

## Evidence

- Frames at 390 px were forced deterministically by injecting `animation-play-state: paused` with a negative `animation-delay` (-200 ms, -400 ms, -3 s) before first paint. Screenshots are in the session scratchpad `...\scratchpad\t060\r2-390-{200,400,after}.png` (not committed). The glyph tops and bottoms are intact at every point, and the -3 s frame matches the settled state.
- Observation: the h1 box spans the full container while the text is centred, so the left-to-right reveal is visually near-complete early (the right-hand inset sweeps mostly empty margin). Left unchanged; say if you want the reveal timing tuned.
- `pnpm verify`: green after this change (`Budgets OK.`).
