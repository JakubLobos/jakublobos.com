# T-068 implementation report, round 1

## Summary

When a visitor types or pastes past a counter-bearing field's `maxlength`, the counter flashes the danger colour and shakes. This covers the guestbook counter and every contact counter. It is a `beforeinput` listener in a motion-only module, with the overflow check as a pure `lib/` function.

## Files

- `apps/web/src/lib/input-limit.ts` + `.test.ts` (new): `wouldOverflow()`, 6 cases (at limit, fits exactly, over by one, selection replacement that fits, one that does not, `maxLength` -1).
- `apps/web/src/scripts/limit-nudge.ts` (new): `bindLimitNudge(control, counter, signal)`. It owns the listener and the WAAPI animation.
- `guestbook-form.ts` and `contact-form.ts`: the import plus one wiring call each. Contact is a short loop over its fields that have a counter.
- `apps/web/src/scripts/motion.ts` (outside Allowed files, see Change Request below).
- `tasks/T-068-limit-nudge.md` (spec, prettier-formatted).

## Design choices

- **Colour: `--color-danger`.** It is the existing "can't do that" signal, the same as an invalid field. No new token. The keyframes use `var(--color-danger)`, which resolves against the counter, so the flash follows the token. No hex in code, and the last frame is implicit, so it returns to the counter's own muted colour. The counter keeps its normal colour at rest, so the colour change only reads as a flash.
- **Timing: `--duration-panel` (350ms)**, inside the spec's 300-400 ms. Easing is `linear` for the whole animation. An eased curve (tried `--ease-out`) squeezed the swings into the first ~60 ms, leaving one visible bounce of 2.8 px.
- **Reduced motion:** colour-only keyframes, no transform.
- **Restart:** the running animation is cancelled before each new one. It is also cancelled on `abort`. Holding a key therefore restarts one animation and never stacks.
- **Layout:** `transform` and `color` only. The counter is a flex item in both places, so the transform applies.
- **Overflow check:** applies to `insertText`, `insertFromPaste`, `insertFromDrop` and `insertLineBreak`. It ignores composition and deletions. Paste and drop text is read from `event.dataTransfer`. A truncated paste counts.

## Offsets

Counter keyframes: translateX 0, -3, +3, -2, +2, 0 px at offsets 0, .15, .35, .55, .75, 1 (2.5 cycles). Colour is danger for the first ~60% and then fades back.

Measured at the production build (`astro preview`, port 4408), mid-animation `translateX`: -2.86, +2.50, -0.15, +0.33, +1.52, then 0.

## Layout-shift check (Playwright, throwaway)

`offsetTop` and `offsetLeft` before and after the nudge:

| Counter         | Before    | After     |
| --------------- | --------- | --------- |
| Guestbook, 1440 | 19, 590   | 19, 590   |
| Guestbook, 390  | 19, 300   | 19, 300   |
| Contact message | 6176, 857 | 6176, 857 |

Typing in a below-limit field leaves `getAnimations().length` at 0. Typing at the limit gives 1.

## Screenshots (`tasks/reports/T-068/screenshots/`)

- `guestbook-1440-1.png`
- `guestbook-1440-2.png`
- `guestbook-1440-3.png`
- `guestbook-390-1.png`

## Validation

`pnpm verify` is green. Test files and tests per package: contracts 4 and 153, server 33 and 412, web 32 and 350.
`check:budgets` reports `Budgets OK`, with critical JS 16.2 / 35.0 KB.
`pnpm test:e2e` was not run, as instructed.

## Change Request: `scripts/motion.ts`

`tokenTiming()` read `--duration-*` with `parseFloat`, assuming ms. The production CSS minifier rewrites `350ms` to `.35s`, and custom properties keep the text, so the animation ran for 0.35 ms (confirmed in the built page: `duration: 0.35`). This also affected the existing callers (guestbook status ink swap) in production builds. I fixed it with a small unit-aware parse (`s` vs `ms`) in `motion.ts`, which was needed for this feature to work at all. Please confirm or move it to its own task. No unit test, since the module is DOM-bound and the repo has no DOM test environment.

## Open issues

- The Playwright checks were throwaway, as the spec allows. There is no committed browser test for the nudge.
- Touch / IME keyboards that send `data: null` on insertion are ignored by design.
