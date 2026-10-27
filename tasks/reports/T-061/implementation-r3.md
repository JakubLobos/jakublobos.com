# T-061 implementation report (round 3)

- Motion code moved out of `guestbook-form.ts` (owner request). New `scripts/motion.ts` holds `tokenTiming` and `prefersReducedMotion`; new `scripts/guestbook-status-motion.ts` holds the keyframes, the running-animation bookkeeping, the abort cleanup and the re-ink, behind `createStatusMotion({ card, texts, signal })` returning `{ swap, cancel }`.
- `guestbook-form.ts` only wires: `render()` keeps the `dialog.open && state changed` decision and calls `motion.swap(state, write)` or `motion.cancel()` plus `write()`. No keyframes, `.animate(`, `getComputedStyle` or `matchMedia` remain there.
- Behaviour unchanged from round 2 (same timings, same cancellation, immediate live region). Both new files added to the task's Allowed files. `pnpm verify` exit 0 (see below).
