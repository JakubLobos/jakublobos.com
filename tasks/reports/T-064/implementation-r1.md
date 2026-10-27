# T-064: Implementation report, round 1

- **Branch:** `task/T-064-field-focus`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Text fields now show the focus ring only for keyboard or unknown-modality focus; a pointer focus shows only the underline, which fills left to right (D-31). A 7-line module, `scripts/input-modality.ts`, records the last input kind on `<html data-modality>`. The guestbook ring moved to the whole row (field and counter), and the counter is now a `<label for="guestbook-body">`, so clicking it focuses the input.

## Files changed

| File                                                    | Change                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/scripts/input-modality.ts`                | added: sets `data-modality` to `pointer` / `keyboard` (capture, passive)                                      |
| `apps/web/src/layouts/BaseLayout.astro`                 | modified: bundled `<script>` import                                                                           |
| `apps/web/src/styles/base.css`                          | modified: no ring on `input`/`textarea` while `data-modality='pointer'`                                       |
| `apps/web/src/components/ui/TypingField.astro`          | modified: `::after` underline fill for the underline variant; bare variant draws no ring (its row owns it)    |
| `apps/web/src/components/guestbook/GuestbookForm.astro` | modified: row `::after` fill, row-level ring, counter as `<label>`                                            |
| `apps/web/src/i18n/messages/contact.ts`                 | modified: PL `too_short` is now `Proszę podać swoje imię.`                                                    |
| `docs/content/pl-copy-review.md`                        | modified: the same string in the PL review table (not in the Allowed list; kept in sync to avoid a stale doc) |
| `docs/design-system.md`                                 | modified: Focus rule 7 describes D-31                                                                         |
| `tasks/T-064-field-focus.md`                            | added: spec                                                                                                   |

## Approach

- **Modality:** no attribute means unknown, and unknown keeps the ring (no JS, first paint, programmatic focus). `pointerdown` sets `pointer`; `keydown` sets `keyboard`. The only CSS that depends on it is the pointer-only suppression: `:root[data-modality='pointer'] :is(input, textarea):focus-visible { outline: none }` in `base.css`, and the same `:root:not([data-modality='pointer'])` guard on the row ring. Buttons, links and radios are untouched.
- **Ring placement:** guestbook: `.row:has(.control:focus-visible)` carries the ring (offset from `--focus-ring-offset`), and the bare-variant control suppresses its own ring. `Highlight` colour in `forced-colors`.
- **Underline fill:** a `::after` over the existing line, `transform: scaleX(0 -> 1)`, `transform-origin: left`, `--duration-state` / `--ease-out`; it retracts toward the left on blur with the same transition. The transition lives only in `prefers-reduced-motion: no-preference`, so reduced motion switches instantly. The guestbook uses `--line` (focus, or danger when `aria-invalid`), so the danger colour wins. Contact fields do the same on `typing-field[data-variant='underline']::after`; the old `.control:focus` border-colour rule was removed since the pseudo replaces it. In forced colours the fill is `Highlight`.
- **Counter click:** declarative. The counter is `<label class="counter" for="guestbook-body">`. The accessible name is unchanged because the input's `aria-label` takes precedence over the label. Playwright check: `labels.length === 1`, `aria-label` is `Your message` / `Twoja wiadomość`, and axe reported no violations. `aria-live="off"` and `data-counter` stay, so the script's counter updates are unchanged.
- **Contact counters:** not changed. They sit beside the field label, not on the input row. Making them a `<label for>` would give the input two labels and concatenate their text into its accessible name (no `aria-label` there). Not a regression, so left alone; flag it if the owner wants it.
- **Contact-form ring decision:** the ring stays on the control only. The counter lives in the header line above the field with the label, and wrapping the label, control and error would draw a large box around three stacked items. A ring on just the input matches the underline fill and reads as intentional.

## Acceptance criteria

| #    | Criterion                        | Status | Evidence                                                                                                                       |
| ---- | -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | Mouse click: no ring, line fills | pass   | Playwright: `mouse row ring none`, contact `none`; `screenshots/guestbook-mouse-mid-*.png` (mid-fill), `guestbook-mouse-*.png` |
| AC-2 | Tab: ring around row, underline  | pass   | `kbd row ring solid 2px`, control `none`; contact `solid 2px`; `guestbook-keyboard-*.png`, `contact-keyboard-*.png`            |
| AC-3 | Unknown modality keeps the ring  | pass   | programmatic `focus()` before any input: `unknown row ring solid 2px`                                                          |
| AC-4 | Counter click focuses the input  | pass   | `counter click focus guestbook-body` (EN/PL, 390/1440); axe `[]`                                                               |
| AC-5 | Reduced motion / forced colours  | pass   | reduced: ring solid, fill `scaleX(1)` instantly; forced: ring `Highlight`-system colour, fill `Highlight`                      |
| AC-6 | PL copy                          | pass   | `contact.ts:99`                                                                                                                |
| AC-7 | `pnpm verify`, `check:budgets`   | pass   | below                                                                                                                          |

## Validation output

```
$ pnpm verify        (format:check, lint, typecheck, test, build all exit 0)
$ node tools/check-budgets.mjs
index.html critical JS 15.7 KB / 35.0 KB, CSS 12.5 KB / 25.0 KB ...
Budgets OK.
```

Playwright (throwaway, not committed) against `astro preview --port 4404`: EN/PL at 390 and 1440; values quoted in the table above. Preview process killed by PID; port 4404 is free.

## Screenshots

`tasks/reports/T-064/screenshots/`: `guestbook-mouse-mid-{en,pl}-{390,1440}.png`, `guestbook-mouse-{en,pl}-{390,1440}.png`, `guestbook-keyboard-{en,pl}-{390,1440}.png`, `contact-mouse-{en,pl}-{390,1440}.png`, `contact-keyboard-{en,pl}-{390,1440}.png`, `guestbook-reduced-keyboard-1440.png`, `guestbook-forced-keyboard-1440.png`.

## Assumptions

- `--duration-state` (200ms) with `--ease-out` for the fill and retract.
- The forced-colours fill uses `Highlight` (CSS backgrounds are otherwise overridden).

## Deviations from spec

- `docs/content/pl-copy-review.md` edited (one string) though not in the Allowed list.

## Open issues

- Contact counter clicks do not focus the input (see above).
- `pnpm test:e2e` not run (per instructions). `e2e/` specs reference focus only for "focuses the first invalid field" (programmatic focus, unaffected) and the nav dialog focus restore; neither asserts the ring or the old PL string.
- PL string `Proszę podać swoje imię.` is a draft pending owner review.
