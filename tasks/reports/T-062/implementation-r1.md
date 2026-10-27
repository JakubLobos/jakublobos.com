# T-062 implementation report (round 1)

## What changed

- `scripts/confetti.ts`: `burstFrom(element)`. Lazy `import('canvas-confetti')` on first burst, one `aria-hidden` canvas (`.confetti-canvas`, fixed, `pointer-events: none`, z-index `--z-scrollbar + 1`: above the header, below the cookie dialog and skip link) created with `resize`, `useWorker: false`, `disableForReducedMotion`. 400 ms per-element throttle (`WeakMap`). Colours come from `PAINT_ORDER`/`PAINTS` resolved with `getComputedStyle` at fire time. Import failures are swallowed and retried on the next burst.
- `lib/confetti-origin.ts` (+ test): bottom-centre of a rect as clamped 0..1 viewport fractions.
- `Hero.astro`: `data-confetti` on the resume button plus a delegated click listener script (never `preventDefault`).
- `contact-form.ts`: `burstFrom(submit)` in the `sent` outcome only.
- `utilities.css`: `.confetti-canvas`. `docs/architecture.md` §10: new row. `tasks/T-062-confetti.md` committed.
- Deps (exact): `canvas-confetti` 1.9.4, `@types/canvas-confetti` 1.9.0 (dev), both in `apps/web`.

## Decisions

- Burst: 70 particles, angle 90, spread 70, startVelocity 38, ticks 120 (about 2 s), default square/circle shapes.
- The canvas stays in the DOM after the first burst; canvas-confetti runs no rAF loop while idle.
- No new z-index token (tokens.css is out of scope), so the canvas uses `calc(var(--z-scrollbar) + 1)` = 6.

## Evidence

`pnpm verify` green. Tail:

```
index.html critical JS 15.2 KB / 35.0 KB, CSS 11.7 KB / 25.0 KB, lazy 4.1 KB / 80.0 KB (1 chunks), preloaded fonts 2 / 2
pl.html    critical JS 15.2 KB / 35.0 KB, CSS 11.7 KB / 25.0 KB, lazy 4.1 KB / 80.0 KB (1 chunks), preloaded fonts 2 / 2
Budgets OK.
```

Before: critical JS 14.2 KB, lazy 0 chunks. The library is the new 4.1 KB lazy chunk; critical JS grew 1.0 KB (trigger, throttle, paint lookup).

Production build on port 4402 with a throwaway Playwright script (`POST /api/contact` stubbed to 200): the resume click bursts and the download starts (`jakub-lobos-cv-en.pdf`); a contact send bursts once from the submit button. CSP/console errors at 390 and 1440 px: none (`[]`). Reduced motion relies on the library's `disableForReducedMotion` and was not screenshotted. The invalid-input and error paths were not exercised in the browser; they never reach the `sent` branch.

Screenshots (`tasks/reports/T-062/shots/`): `resume-{390,1440}-{150,500,900}.png`, `contact-{390,1440}-{150,500,900}.png`.
