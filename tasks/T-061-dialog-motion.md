# T-061: Dialog motion: mobile menu and guestbook review modal

- **Wave:** 7 (motion) · **Size:** M · **Depends on:** T-023, T-029, T-036 (done)
- **Owner decision:** the owner asked for richer motion on 2026-10-27 (recorded as D-30 in `open-questions.md`). Motion is an approved addition; keep the current look (paper, ink borders, hard shadows, paint drips).

## Goal

The mobile menu and the guestbook "review" modal currently snap open, snap shut and swap texts instantly. Make them feel like paper objects: they open, close and change state smoothly and deliberately, in the site's playful hand-made style. Keep them quick (≤ ~400 ms per transition) and never block interaction.

## 1. Mobile menu (`MobileMenu.astro`, `scripts/mobile-menu.ts`)

- **Open:** the full-screen sheet unrolls from the top like a paper sheet pulled down (`clip-path: inset(0 0 100% 0)` → `inset(0)`, or `translateY(-100%)` → `0`; pick whichever looks better with the drips). The numbered links then come in with a short stagger (small `translateY` plus slight rotate, in the spirit of the existing `type-in`), followed by the bottom row.
- **Close:** the reverse, faster (~60–70 % of the open duration). Closing via a link must still navigate and scroll to the section; the animation must not delay or break the anchor jump (the `close` handler restores focus and scroll lock today; keep that contract).
- **Technique (preferred, no JS timers):** native `<dialog>` with CSS `@starting-style` plus `transition` on `display` and `overlay` with `transition-behavior: allow-discrete`. Where `overlay` isn't supported (Firefox), the exit may be instant; that is acceptable progressive enhancement. Don't build a JS animation state machine.
- Hamburger button: optional subtle press or morph only if it fits the existing `ChromeButton`; don't redesign it.

## 2. Guestbook review modal (`GuestbookModal.astro`, `scripts/guestbook-form.ts`)

- **Open:** the backdrop fades in and the card is "placed on the desk": from a small `translateY`, slight rotation and `scale(.96)` to rest, with `--ease-spring`. **Close:** a quick fade and drop. Same `@starting-style` and `allow-discrete` technique.
- **State changes** (`checking → slow → approved | rejected | superseded`, see `render()` in `scripts/guestbook-form.ts` and `lib/guestbook-status.ts`): when the state changes while the dialog is open, the eyebrow, title and copy swap with a short "re-ink" (old fades out and up a little, new fades in), not an instant replace. Use the Web Animations API (`element.animate`) inside `render()`. Skip it on the first render and when `matchMedia('(prefers-reduced-motion: reduce)')` matches. The live region text must update immediately; don't delay it behind the animation.
- **Outcome accents** (small, tasteful):
  - _approved_: the brush stroke already fills; add one small celebratory settle of the card (a tiny scale or rotate bounce), and optionally a pop of the existing `CheckIcon` if it fits without new design.
  - _rejected / superseded_: a short horizontal "paper nudge" (a 2–3 cycle wobble of a few px), nothing alarming.
- The card must not change size between states (min-heights are reserved today; keep that).

## Constraints (both)

- Reduced motion: no transforms or clip-path transitions; at most an instant change (a very short opacity fade is acceptable). Forced colours unaffected.
- CSP: no `style=""`, no `define:vars`, no inline handlers. `element.animate()` and `style.setProperty` are fine.
- Animate only `transform`, `opacity` and `clip-path`. Listeners via the existing `AbortController` signal; cancel running animations on disconnect or close where relevant.
- Tokens only. **Do not edit `styles/tokens.css` or `styles/keyframes.css`** (T-060 owns them in parallel). Use the existing motion tokens (`--duration-*`, `--ease-spring`, `--ease-type`, `--ease-standard`). Keyframes specific to a component go in that component's `<style>` with a component prefix (`menu-`, `modal-`).
- Accessibility must not regress: focus moves into the dialog on open and returns on close (existing behaviour), Escape, the Tab wrap, `aria-expanded`, and the scroll lock.
- Reuse what exists (`brush` keyframe, `CheckIcon`, `ChromeButton`, `PaintDrips`). No new dependencies.

## Allowed files

`apps/web/src/components/site/MobileMenu.astro`, `apps/web/src/scripts/mobile-menu.ts`, `apps/web/src/components/guestbook/GuestbookModal.astro`, `apps/web/src/scripts/guestbook-form.ts`, `apps/web/src/scripts/motion.ts`, `apps/web/src/scripts/guestbook-status-motion.ts`, `apps/web/src/lib/guestbook-status.ts` (only if a pure helper is genuinely needed, with a test), `tasks/T-061-dialog-motion.md` (commit this spec), `tasks/reports/T-061/**`.

## Acceptance criteria

1. The menu opens and closes with the sheet motion and staggered links in Chromium and WebKit. In Firefox it opens animated and closes instantly or animated, never broken.
2. Selecting a menu link closes the menu and lands on the section, with focus behaviour as today.
3. The modal opens and closes animated; state changes re-ink the texts; approved and rejected accents play once.
4. Reduced motion: no movement anywhere in either dialog.
5. `pnpm verify` green. Existing unit tests unchanged or updated with a reason.

## Validation

- `pnpm verify`.
- Visual check with the real API: `pnpm dev` (**you are the only agent allowed on ports 3000/4321**; others use 4401/4402; memory is tight, so stop it when done and kill only PIDs you started). With the fake moderator, a normal note gets approved, and a note containing `[flag]` or `[unsuitable]` gets rejected. Capture a few frames per transition (390 px for the menu; 390 and 1440 px for the modal) with a throwaway Playwright script that isn't committed, and list the paths in the report.
- Don't run `pnpm test:e2e` (CI runs it on the PR). Do re-read `e2e/` specs that open the menu or the modal, and make sure your changes can't make them flaky (e.g. a click landing during an exit transition). Report anything risky.
- Tests: only for new pure logic, if any. No tests for CSS.
