# T-068 implementation report, round 2

Addresses review round 1 (CHANGES_REQUESTED).

## R1-01: fixed

The minifier turns `350ms` into `.35s`, so every `parseFloat`-as-ms read was wrong in production, including `mascot.ts` (the blink lasted 0.18 ms). It is now fixed in one shared place.

- `apps/web/src/lib/css-time.ts` + `.test.ts` (new): `parseCssTime(raw): number | null`, returning milliseconds. The test covers `350ms`, `.35s`, `0.35s`, `1s` and padded input. It rejects empty, unitless, garbage and negative values.
- `scripts/motion.ts`: new `tokenDuration(element, durationVar, fallbackMs = FALLBACK_MS)`, built on `parseCssTime`. `tokenTiming` uses it, and the inline parse from round 1 is gone.
- `scripts/mascot.ts`: only the import and the one `parseFloat` line changed. It calls `tokenDuration(this, '--duration-blink', BLINK_FALLBACK_MS)`. The optional third argument keeps the mascot's 180 ms fallback; the default fallback is 150 ms.

## R1-02: fixed

`limit-nudge.ts` now passes `{ duration: tokenDuration(counter, '--duration-panel'), easing: 'linear' }`. The comment explaining why the easing is linear is kept.

## Browser check (production build, `astro preview` on port 4408 only)

- Counter nudge: `effect.getComputedTiming().duration` = **350**.
- Mascot blink animation (found via `scale: '1 0.1'` keyframes): duration = **180**.
- Guestbook status swap: it goes through `tokenTiming(card, '--duration-hover', ...)`, which now uses the same parser. I did not drive it in the browser, since it needs the API review flow. Its `.15s` token parses to 150 via the covered test cases.

## Validation

`pnpm verify`: green. Web tests 360 passed (350 before, plus the new css-time cases). `Budgets OK`. The preview server on 4408 was killed and the throwaway script deleted.
