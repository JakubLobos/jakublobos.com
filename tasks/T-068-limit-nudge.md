# T-068: Counter nudge when typing past the character limit

- **Wave:** 7 (motion) · **Size:** S · **Depends on:** T-029, T-030, T-061, T-064 (done)
- **Owner request (2026-10-27, part of the D-30 motion work):** when a visitor tries to type past a field's maximum length, in the guestbook ("I love connecting people through the power of frontend") or in a contact form field, the counter (e.g. `120/120`) briefly lights up and does a small left–right shake. It should be tasteful, in the site's hand-made paper style, and clean.

## Behaviour

- **Trigger:** an attempted insertion that the field can't take, because the control is at `maxlength` or the insert wouldn't fit. Use the `beforeinput` event, which fires even though `maxlength` then blocks the change.
  - Trigger for `insertText`, `insertFromPaste`, `insertFromDrop` and `insertLineBreak` (textarea) when `data.length > maxLength - (value.length - selectedLength)`.
  - A paste that gets truncated also counts.
  - Ignore deletions, IME composition (`isComposing`, `data === null`), and inserts that replace a selection and still fit.
- **Effect** on the counter element only (not the field): a short horizontal shake of a few px, 2–3 cycles, about 300–400 ms, plus a brief colour highlight that returns to the normal muted colour.
  - Use the danger colour (`--color-danger`), the same signal as an invalid field, unless another existing token reads better. Justify the choice in the report.
  - Repeated attempts while it is running restart it cleanly (cancel the running animation; don't stack them).
  - No layout shift: animate `transform` and colour only.
- **Reduced motion:** no shake; the colour flash alone is fine.
- **Forced colours:** nothing breaks; colour may be ignored.
- **Screen readers:** don't add new announcements. The guestbook already announces "limit reached" via its live region; contact relies on the counter being in `aria-describedby`. The nudge is purely visual.

## Where

- Guestbook: the counter `[data-counter]` in `GuestbookForm.astro` (now a `<label>`, T-064) for `#guestbook-body`.
- Contact: every `FormField` that renders a counter (`[data-count]`, see `components/contact/FormField.astro`). Fields without a counter get no nudge.

## Architecture (follow exactly)

- **Motion lives in its own module** (owner rule: motion code never sits inside form or logic scripts). Create `apps/web/src/scripts/limit-nudge.ts`, exporting e.g. `bindLimitNudge(control: HTMLInputElement | HTMLTextAreaElement, counter: HTMLElement, signal: AbortSignal): void`.
  - It owns the `beforeinput` listener and the WAAPI animation.
  - Reuse `tokenTiming()` and `prefersReducedMotion()` from `scripts/motion.ts` (T-061) for durations and easing from tokens. No hard-coded ms or easing values.
  - Colours come from tokens via `getComputedStyle`, or better, via a CSS custom property or class toggled on the counter whose rule lives in the component `<style>`. Pick the cleaner option; keep CSP rules (no `style=""`; `element.animate` and `style.setProperty` are fine).
- **Pure logic in `lib/`:** the "would this insert overflow?" check goes in `apps/web/src/lib/` (DOM-free; e.g. `lib/input-limit.ts`, `wouldOverflow({ maxLength, valueLength, selectionLength, insertLength })`), with a focused unit test covering: at limit, fits exactly, overflow by one, replacing a selection that fits, and no `maxLength` (`-1`).
- **Wiring only** in the feature scripts: `scripts/guestbook-form.ts` and `scripts/contact-form.ts` each add one `bindLimitNudge(...)` call with their existing `AbortSignal`. Nothing else changes there.
- Tokens only; no new tokens unless genuinely needed (if needed, add them to `tokens.css` and `docs/design-system.md` §2.8 and say why). No new dependencies.

## Allowed files

`apps/web/src/scripts/limit-nudge.ts` (new), `apps/web/src/lib/input-limit.ts` + `.test.ts` (new), `apps/web/src/scripts/guestbook-form.ts` and `apps/web/src/scripts/contact-form.ts` (one wiring call each, plus the import), `apps/web/src/components/guestbook/GuestbookForm.astro` and `apps/web/src/components/contact/FormField.astro` (counter style hook only, if you use a class or property), `apps/web/src/styles/tokens.css` + `docs/design-system.md` §2.8 (only if a token is truly needed), `tasks/T-068-limit-nudge.md` (commit this spec, prettier-formatted), `tasks/reports/T-068/**`.

## Acceptance criteria

1. In the guestbook at `120/120`, typing a character makes the counter flash and shake once; holding a key keeps it responsive without stacking.
2. Pasting text that overflows (partly truncated) nudges once.
3. Contact fields with counters behave the same way; fields below the limit never nudge.
4. Reduced motion: colour flash only. No layout shift. No new announcements.
5. `pnpm verify` green (including `check:budgets`).

## Validation

- `pnpm verify`.
- Throwaway Playwright script (not committed) on `pnpm --filter @portfolio/web build` + `astro preview --port 4408`. **Port 4408 only**: the owner runs `pnpm dev` on 3000/4321; kill only PIDs you started.
  - Fill the guestbook to its limit, press a key, and capture 3 frames of the nudge at 1440 px and 1 at 390 px.
  - Do the same for one contact field.
  - Assert that the counter's `offsetTop` and `offsetLeft` are unchanged (no layout shift).
  - Keep max 4 PNGs in `tasks/reports/T-068/screenshots/` and list them.
- Don't run `pnpm test:e2e`.
