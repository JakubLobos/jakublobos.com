# T-028: Implementation report, round 1

- **Branch:** `task/T-028-typing-field` (HEAD of the branch; based on `main` @ `ca4e4f1`)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

`ui/TypingField.astro` renders a real `<input>`/`<textarea>` plus an `aria-hidden` mirror inside a `<typing-field>` custom element (`scripts/typing-field.ts`). The element keeps one node per grapheme in the mirror, so only newly inserted characters get the `type-in` animation and untouched nodes are never moved (a moved node would replay its animation). The pure model (grapheme split, prefix/suffix diff with a caret hint, word/segment runs) lives in `lib/text-diff.ts` with unit tests. Without JS, under reduced motion and in forced colours the mirror is `display: none` and the control shows its own text.

## Files changed

| File                                           | Change                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `apps/web/src/components/ui/TypingField.astro` | added: component, props, styles, fallbacks                                              |
| `apps/web/src/scripts/typing-field.ts`         | added: `typing-field` custom element (mirror sync, auto-grow, scroll sync, `reset()`)   |
| `apps/web/src/lib/text-diff.ts`                | added: `splitGraphemes`, `unitIndexAt`, `diffUnits`, `splitRuns`, `isWhitespaceUnit`    |
| `apps/web/src/lib/text-diff.test.ts`           | added: 15 tests                                                                         |
| `apps/web/src/dev/showcase.astro`              | modified: "Typing fields" section (self-contained, `tf-*` classes, fixtures via script) |
| `tasks/reports/T-028/screenshots/*.png`        | added: showcase at 1440 and 390                                                         |

## Consumer API (for T-029 / T-030)

```astro
<label for="c-name">…</label>
<TypingField
  id="c-name"
  name="name"
  maxlength={60}
  placeholder={t.placeholder}
  autocomplete="name"
  describedBy="c-name-err"
/>
```

- Props: `as?: 'input'|'textarea'` (default input), `id`, `name`, `maxlength`, `placeholder` (required); `type?: 'text'|'email'`, `inputmode?`, `autocomplete?`, `rows?` (3), `autoGrow?` (textarea), `required?`, `disabled?`, `invalid?`, `describedBy?` (ids of error and counter), `ariaLabel?` (for label-less rows such as the guestbook), `variant?: 'underline'|'bare'` (default underline; `bare` draws no line because the guestbook row owns it).
- Error state is the `aria-invalid="true"` attribute on the control. `invalid` sets it at render time; scripts toggle it with `setAttribute`/`removeAttribute` (CSS keys on the attribute). Focus colour wins over the error colour, as in the design.
- Toggle `control.disabled` directly. No custom events; use the control's native `input`, `blur`, `change`. Call `document.querySelector('typing-field').reset()` after a successful submit.
- Programmatic `control.value = …` should be followed by `control.dispatchEvent(new Event('input', { bubbles: true }))` (the showcase does this); form `reset` and back-forward restore resync automatically.

## Acceptance criteria

| #    | Criterion (short)                                         | Status                 | Evidence                                                                                                                                                                                                                                                                                                 |
| ---- | --------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Only new characters animate; delete doesn't re-animate    | pass                   | `diffUnits` tests in `text-diff.test.ts`. Browser run (headless Chrome over CDP, throwaway harness, not committed): after typing "Ab" then "c" glyph spans 0 and 1 are the same DOM nodes and only the new one has `data-fresh`; after a mid-word delete and a word merge `[data-fresh]` count is 0.     |
| AC-2 | Paste, IME, selection replace, undo keep mirror equal     | pass                   | Same run, mirror `textContent === control.value` after: 60-char paste (`Input.insertText`), IME composition ("ń") and commit (composing glyph not `fresh`), select-all + type "Zażółć", undo, backspace, space split and merge. The 120-character paste was run as 60; the code path is the same splice. |
| AC-3 | Screen readers announce the control, never the mirror     | pass (by construction) | The mirror is `aria-hidden="true"` (asserted in the run); the control keeps its native role and `aria-label`/`aria-describedby`/`aria-invalid`. Not tested with a screen reader.                                                                                                                         |
| AC-4 | Reduced motion and forced colours: native text, no mirror | pass                   | Run with `Emulation.setEmulatedMedia` for `prefers-reduced-motion: reduce` and `forced-colors: active`: mirror computed `display` is `none` and control colour is not transparent in both.                                                                                                               |
| AC-5 | Long single line scrolls with the caret, mirror follows   | pass                   | Run: End key on the 150-char input gives `control.scrollLeft = 370`, `mirror.scrollLeft = 370`. `typing-field-1440.png` shows the scrolled field.                                                                                                                                                        |

## Validation output

```
$ pnpm verify          (exit 0)
All matched files use Prettier code style!
eslint .               (clean)
apps/web typecheck: - 0 errors
packages/contracts test:  Tests  153 passed (153)
apps/server test:         Tests  263 passed (263)
apps/web test:            Tests  113 passed (113)    (7 files, text-diff.test.ts = 15)
apps/web build: - 0 errors, output: "static"
```

Browser checks (not committed, per the "test only extracted logic" instruction): 37 assertions in a CDP harness against `astro dev`, 0 failures. They included line-wrap parity between the mirror and a real auto-grown textarea for plain prose, hyphenated words, em dashes, a URL, an over-long token and newlines at widths 180 to 300.

## Tests added

- `lib/text-diff.test.ts`: identical text, append, paste in the middle, delete in the middle, selection replace, clear/fill, caret disambiguation among repeated characters, ignored mismatching caret, combining accents and surrogate pairs staying one unit, UTF-16 offset to unit mapping, word/whitespace runs, wrap-opportunity splitting (hyphen, `?`, em dash) and non-splits (slashes, ranges, stray hyphens).

## Screenshots

`tasks/reports/T-028/screenshots/typing-field-1440.png`, `typing-field-390.png` (the "Typing fields" showcase section: focused name, filled, error, disabled, auto-grow textarea, long single line, bare variant; the name field is focused to show the blue underline plus ring). Measured against `desktop-1440-contact-errors.png`: label-to-line distance 61 px (design 61), textarea label-to-line 112 px (design 112), 17 px Poppins, 2 px lines, error `--color-danger`, error text 13 px. Compared by eye, not pixel diff. The empty placeholder state is in the showcase on load but not in the screenshots (the capture fills the name field). I did not capture 768/1024 (not requested).

## Assumptions

- `value` is not a prop; forms prefill through the DOM. Disabled is not restyled: the design only disables inputs while sending and shows no change, so the component just neutralises Safari's disabled dimming.
- Label, counter and error markup belong to the consumer (spec: no label inside).
- The 94 px textarea `min-height` from the prototype is not reproduced; `rows=3` already gives 98.5 px, which matches the design screenshot.

## Deviations from spec or design

- `splitRuns` splits long tokens into several nowrap segments at hyphens, after `?` and around em dashes. Without this, a hyphenated word that straddles a line end would sit on the next line in the mirror while the (invisible) textarea breaks after the hyphen, leaving caret and selection on the wrong line. The opportunities were taken from Chrome's behaviour with a probe; slashes do not break. Not in the prototype, which has this bug.
- In a multi-line field, word boxes are `inline-block; max-width: 100%` so a token longer than a full line wraps inside itself, as the textarea does (the prototype's `nowrap` spans overflow and clip).

## Change Requests

None.

## Open issues and follow-ups

- Known limit: when a single unbreakable token is longer than a full line (a URL over roughly 40 characters on a phone), the text after its last partial line starts on a new line in the mirror, while the textarea continues on the same line. Only the line after that token is affected. Fixing it needs JS measurement; I left it.
- Break opportunities were checked in Chrome only. Firefox and Safari may differ for hyphens or `?` in rare cases.
- Chrome autofill: the autofilled background still shows; only the doubled text is suppressed. Not verified in a real autofill session.
- IME was exercised with Chrome's synthetic composition, not a real Polish dead-key or AltGr session; a manual check on the owner's machine is still worthwhile.
- The Astro-inlined or bundled script and the CSP hash are T-021's domain; nothing in this component uses inline styles, `define:vars` or HTML sinks (`textContent` only, and `style.height` through the CSSOM).
