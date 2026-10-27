# T-062: Confetti bursts on "Send message" success and "Get my resume"

- **Wave:** 7 (motion) · **Size:** S · **Depends on:** T-024, T-030 (done)
- **Owner decision:** on 2026-10-27 the owner asked for confetti bursting out from under these buttons and scattering (recorded as D-30 in `open-questions.md`). The orchestrator approves the dependency below (it is added to `docs/architecture.md` §10 in this task).

## Library choice (decided; don't swap it)

**`canvas-confetti` 1.9.4** (ISC, zero dependencies, ~4 KB gz, ~7 M weekly downloads) with **`@types/canvas-confetti` 1.9.0** (dev). It was chosen over `@hiseb/confetti` (confettijs.org) for these reasons: built-in `disableForReducedMotion`; `origin`/`angle`/`spread` control for a burst "from under the button"; you can own the canvas; and it doesn't rely on `oklch(from …)` canvas colours, which render black in older browsers.

Install: `pnpm --filter @portfolio/web add -E canvas-confetti@1.9.4` and `pnpm --filter @portfolio/web add -D -E @types/canvas-confetti@1.9.0`.

## Behaviour

- **Get my resume** (hero secondary button, a `download` link): on click, a burst comes from the button and the download proceeds normally (never `preventDefault`).
- **Send message** (contact form): the burst fires **when the message has actually been sent** (the transition to the `sent` phase in `scripts/contact-form.ts`), not on every click. A failed validation or network error must not celebrate.
- **Burst look:** the particles shoot up from the button's bottom edge, fan out (spread roughly 60–80°, `angle: 90`) and scatter and fall; about 1.5–2 s total; around 60–90 particles. The colours are the site's paint palette (the `--paint-*` tokens; resolve them at fire time with `getComputedStyle`, or from `lib/paints.ts` if it already maps them, rather than hard-coding hexes). Small squares and circles. Tasteful, not a full-screen party.
- Repeated clicks are fine (bursts stack), but cap it: ignore a new burst while one fired < ~400 ms ago from the same button.

## Implementation constraints

- **Lazy load:** `await import('canvas-confetti')` on first use only, so the initial JS for the page is unchanged (`pnpm check:budgets` must pass and the initial bundle must not grow beyond the tiny trigger code).
- **One small module** `apps/web/src/scripts/confetti.ts` exporting something like `burstFrom(element: Element): void` (it handles the lazy import, the throttle and the colours). Keep the pure part (computing the normalised `origin` from a `DOMRect` and the viewport size, clamped to 0..1) in `apps/web/src/lib/confetti-origin.ts`, with a focused unit test. No DOM in `lib/`.
- **CSP:** the site CSP has no `worker-src blob:`. Use `confetti.create(canvas, { resize: true, useWorker: false, disableForReducedMotion: true })`. The canvas must be `aria-hidden="true"`, `pointer-events: none`, fixed and full-viewport, stacked above the header (`--z-*` tokens) and below the skip link and dialogs. Prefer creating it lazily in `confetti.ts` with a CSS class whose rules live in a stylesheet you're allowed to edit (e.g. a `:global(.confetti-canvas)` rule in `Hero.astro` won't do since contact needs it too; use `styles/utilities.css`), or set the few properties via CSSOM (`canvas.style.setProperty`), which is CSP-safe. No `style=""` in markup. Remove it, or leave it idle with zero cost, after the burst (no rAF loop while idle; canvas-confetti stops on its own).
- **Reduced motion:** no confetti at all (`disableForReducedMotion`). Nothing else changes.
- **Hook:** add a `data-confetti` attribute to the resume `<Button … download …>` in `Hero.astro` (only that line, plus a `<script>` import at the end of the file; a parallel task, T-060, is editing the hero's styles), and a small delegated or custom-element listener. Contact calls `burstFrom(submitButton)` where the phase becomes `sent`.
- No analytics changes. No `any`. Errors from the dynamic import are caught and ignored silently, since confetti is decorative (with a short comment saying why).

## Allowed files

`apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/src/scripts/confetti.ts` (new), `apps/web/src/lib/confetti-origin.ts` + `.test.ts` (new), `apps/web/src/components/sections/Hero.astro` (the resume Button line and a script import only), `apps/web/src/scripts/contact-form.ts`, `apps/web/src/components/contact/ContactForm.astro` (only if a hook is needed), `apps/web/src/styles/utilities.css` (the canvas class only), `docs/architecture.md` (§10: add the `canvas-confetti` row; web; "decorative confetti bursts, lazy-loaded"), `tasks/T-062-confetti.md` (commit this spec), `tasks/reports/T-062/**`.

## Acceptance criteria

1. Clicking "Get my resume" bursts confetti from the button and the PDF download still starts.
2. A successful contact send bursts confetti from the submit button once; invalid input, rate limits and errors don't.
3. Reduced motion: no confetti.
4. No CSP violations in the console (the build's meta CSP applies under `astro build && astro preview` or the edge emulator; check with a production build, not just `astro dev`).
5. Initial page JS is unchanged apart from the trigger code; the library chunk loads only on first burst. `pnpm verify` green.

## Validation

- `pnpm verify`.
- Visual check on **port 4402 only** (other agents use 3000/4321/4401; memory is tight, so stop servers when done and kill only PIDs you started): `pnpm --filter @portfolio/web build` then `pnpm --filter @portfolio/web exec astro preview --port 4402`. Use a throwaway Playwright script that isn't committed, and stub `POST **/api/contact` with `page.route` (success → 2xx per `docs/api.md`) because no API runs on your port. Capture a few frames of each burst at 390 and 1440 px, and record console CSP errors (expect none). List the paths in the report.
- Don't run `pnpm test:e2e` (CI runs it on the PR).
- Tests: only `lib/confetti-origin.test.ts` (clamping and the bottom-centre of the rect). Nothing else.
