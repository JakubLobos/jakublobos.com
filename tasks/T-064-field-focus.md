# T-064: Text-field focus: keyboard-only ring, animated underline, clickable counter

- **Wave:** 7 (polish) · **Size:** S–M · **Depends on:** T-022, T-029, T-030 (done)
- **Owner decision (2026-10-27, recorded as D-31 by the orchestrator):** refines D-19 for text fields. The ring shows only for keyboard and assistive-tech focus. A pointer focus shows only the underline, which fills left to right.

## Owner's report

In the guestbook ("I love connecting people through the power of frontend" / "Uwielbiam łączyć ludzi siłą frontendu"):

1. Clicking the `0/120` counter doesn't focus the input.
2. The focus ring wraps only the input, not the counter, which looks off.
3. The owner doesn't like the ring on a plain mouse click. They want the ring **only when navigating by keyboard (Tab) or other assistive tools**. On click, only the underline should highlight, and it should **animate, filling from left to right**.
4. Copy fix: the PL contact name error `'Podaj, proszę, swoje imię.'` (`i18n/messages/contact.ts:99`) becomes **`'Proszę podać swoje imię.'`**.

## Background (verified by the orchestrator)

- `base.css` puts `:focus-visible { outline: var(--focus-ring) }` on everything. Browsers **always** match `:focus-visible` for text inputs, even on mouse click, which is why the ring appears on click. CSS alone can't tell a click from Tab on a text field.
- The guestbook row (`GuestbookForm.astro` `.row`) owns the underline (`border-bottom`, `.row:focus-within` → `--color-focus`, `.row:has([aria-invalid])` → danger). The field is `TypingField variant="bare"`. The counter is a sibling `span.counter` in the row.
- Contact fields use `TypingField variant="underline"`: the control draws its own `border-bottom`, with `.control:focus` → `--color-focus` (`components/ui/TypingField.astro`). They are wrapped by `components/contact/FormField.astro`, with a counter beside the label.

## Required behaviour

**A. Input modality (keyboard vs pointer).**

- Add a tiny DOM module, `apps/web/src/scripts/input-modality.ts`, loaded once site-wide from the base layout (a bundled `<script>` import, not inline: the CSP forbids inline scripts).
- It sets `document.documentElement.dataset.modality` to `'pointer'` on `pointerdown` and `'keyboard'` on `keydown`. Use capture-phase passive listeners. Ignore modifier-only or synthetic edge cases only if needed.
- **The default (attribute absent, i.e. no JS, or nothing pressed yet, or programmatic focus such as the dialog returning focus) must keep the ring.** Accessibility wins whenever the modality is unknown.
- Don't add a dependency (`what-input` or the `focus-visible` polyfill): a ~10-line module is the right size here. Put a one-line _why_ comment on it.

**B. Text fields (guestbook row and contact `TypingField`s), consistently.**

- **Pointer focus** (`:root[data-modality='pointer']`): no outline ring on text fields. The underline highlights in `--color-focus` by **filling left to right**: a pseudo-element over the existing line, animated with `transform: scaleX(0 → 1)` and `transform-origin: left`, using existing motion tokens (`--duration-*`, `--ease-out`). On blur it retracts or fades (your call; keep it quick). Invalid state (danger colour) must still win.
- **Keyboard or unknown focus:** the ring shows, **plus** the same underline fill. In the guestbook, the ring must wrap the **whole row (input + counter)**, not only the input. Move the ring to the row, e.g. `.row:has(.control:focus-visible)` and suppress it on the inner control. For contact fields, decide whether the ring should wrap control + counter in the same way, given the `FormField` layout (the counter sits beside the label); choose what looks intentional and explain why in the report.
- Scope this to text fields only. Buttons, links, radios (paint picker) etc. keep today's `:focus-visible` ring unchanged; browsers already show it only for keyboard there.
- `prefers-reduced-motion: reduce`: no scale animation; the colour change is instant. `forced-colors: active`: the ring must still appear for keyboard focus (`Highlight`); the underline must stay visible.

**C. Clicking the counter focuses the input** (guestbook; also the contact counters if they have the same issue). Prefer a declarative solution: e.g. make the counter a `<label for="guestbook-body">`, or make the whole row a click target. Verify that the input's accessible name stays exactly `m.form.label` (it has `aria-label`, which takes precedence) and that axe stays clean. If a label isn't clean, use a small listener in the existing component script, not a new file. Don't break the counter's `aria-describedby` role.

**D. Copy:** `contact.ts` PL `too_short: 'Proszę podać swoje imię.'`. EN unchanged. Check unit tests and e2e snapshots that assert the old string.

## Constraints

- Tokens only; no new colours. Component-scoped `<style>` per ADR-0008. CSP: no `style=""`, inline handlers or `define:vars`.
- Update `docs/design-system.md` focus rule (§ "Focus", item 7, and the `--focus-ring` row if needed) to describe D-31 in one or two sentences.
- **Parallel task:** T-063 (another agent) edits the error and status logic in `scripts/guestbook-form.ts`, `scripts/phone-reveal.ts`, `scripts/contact-form.ts` and possibly the `.error` rules in `GuestbookForm.astro` / `FormField.astro`. Don't touch those scripts or the `.error` rules. If `origin/main` moves before you open the PR, `git merge origin/main` (never rebase or force-push).

## Allowed files

`apps/web/src/scripts/input-modality.ts` (new), the base layout file that loads site-wide scripts (find it under `apps/web/src/layouts/`; only the script import), `apps/web/src/styles/base.css` (focus rules only), `apps/web/src/components/ui/TypingField.astro`, `apps/web/src/components/guestbook/GuestbookForm.astro` (row, counter and focus only), `apps/web/src/components/contact/FormField.astro` (counter and focus only), `apps/web/src/i18n/messages/contact.ts` (the one PL string), tests or e2e specs asserting that string or focus behaviour (only if they break), `docs/design-system.md` (focus rule), `tasks/T-064-field-focus.md` (commit this spec), `tasks/reports/T-064/**`.

## Acceptance criteria

1. Mouse click into the guestbook field or a contact field: no ring; the underline fills left to right in `--color-focus`.
2. Tab into the same fields: the ring shows (around the whole guestbook row) and the underline is highlighted. Buttons, links and radios are unchanged.
3. Without JS or before any input event, focused fields show the ring (no regression for D-19).
4. Clicking `0/120` focuses the guestbook input; its accessible name is unchanged; axe is clean.
5. Reduced motion: no animation. Forced colours: keyboard ring visible.
6. The PL name error reads "Proszę podać swoje imię."
7. `pnpm verify` green; `pnpm check:budgets` passes (the modality script is tiny).

## Validation

- `pnpm verify`.
- Throwaway Playwright script (not committed): `pnpm --filter @portfolio/web build` + `pnpm --filter @portfolio/web exec astro preview --port 4404`. **Use port 4404 only**: the owner runs `pnpm dev` on 3000/4321, and another agent uses 4403. Kill only PIDs you started.
  - Screenshots at 390 and 1440 px (PL and EN) of: guestbook mouse focus mid-animation and settled; guestbook keyboard focus; contact field mouse vs keyboard focus; reduced motion; forced colours (`forcedColors: 'active'`).
  - Run a click on the counter and then assert `document.activeElement.id === 'guestbook-body'`.
  - List the paths in the report.
- Don't run `pnpm test:e2e` (CI runs it). Do re-read `apps/web/e2e/` specs that check focus rings or field focus (e.g. a11y and keyboard specs), and adjust them only if the asserted behaviour intentionally changed.
- Tests: none for CSS. The modality module is DOM glue; no unit test needed.
