# T-028: Animated typing field (mirror technique)

|                          |                              |
| ------------------------ | ---------------------------- |
| **Wave**                 | 4                            |
| **Depends on**           | T-020, T-022                 |
| **Blocked by decisions** | none                         |
| **Parallel with**        | T-023…T-027, T-031           |
| **Size**                 | M                            |
| **Requirements**         | FR-26, FR-29, NFR-02, NFR-03 |

## Objective

Provide one reusable field component that reproduces the design's per-character "type-in" animation over a real, fully accessible `<input>` or `<textarea>`. Used by the guestbook (T-029) and contact (T-030) forms.

## References

- `docs/design-analysis.md` §4.13 (behaviour and production notes), §4.11 (guestbook input), §4.12 (contact fields)
- `docs/design/extracted/design-source.html` L226, L264, L274, L284, L408–419, L618
- `docs/design-system.md` §2.8 (`type-in`, `--duration-type`, `--ease-type`), §3 rules 6–8
- Screenshots: `desktop-1440-guestbook-typing.png`, `desktop-1440-contact-success.png`

## Scope

- `ui/TypingField.astro`:
  - props `as: 'input' | 'textarea'`, `id`, `name`, `type?`, `autocomplete?`, `inputmode?`, `maxlength`, `placeholder`, `rows?`, `autoGrow?`, `describedBy?`, `invalid?`, `variant: 'underline' | 'bare'`
  - renders a wrapper `<typing-field>` containing the real control (transparent text, ink caret) and an `aria-hidden` mirror element
  - **no label inside**: forms provide labels via `<label for>`
- `scripts/typing-field.ts` (custom element):
  - keeps the mirror text equal to the control value, rendering words as `nowrap` spans of `inline-block` characters
  - **only newly inserted characters animate**: diff the previous and current values by common prefix/suffix; existing spans are reused
  - syncs mirror scroll with the control (`scroll`, `input`, `keyup`, `select` events)
  - auto-grows the textarea height when `autoGrow`
  - exposes `reset()` (clears value and mirror; used after a successful submit)
- **Fallbacks** (the mirror is hidden and native text colour restored): `prefers-reduced-motion: reduce`, `forced-colors: active`, and before the element upgrades (no JS). The control must be fully usable with no JS.
- Add to the dev showcase: input, textarea with auto-grow, error state, and disabled state.

## Allowed files

`apps/web/src/components/ui/TypingField.astro`, `apps/web/src/scripts/typing-field.ts`, `apps/web/src/lib/text-diff.ts` (+ test), `apps/web/src/dev/showcase.astro`.

## Implementation notes

- Font metrics must match exactly between control and mirror: same font, size, line-height, and padding, with `font-kerning: none` and `font-variant-ligatures: none` on both.
- Paste, IME composition (`compositionstart`/`end`: don't animate mid-composition), undo, selection replacement, and deleting in the middle must keep the mirror in sync.
- No `style=` attributes in markup. Height for auto-grow is set via `style.height` at runtime (CSSOM, allowed).

## Acceptance criteria

- **AC-1** Typing animates only new characters; deleting removes characters without re-animating the rest (`lib/text-diff.ts` unit tests plus a manual recording or e2e check).
- **AC-2** Paste of 120 characters, IME input (Polish diacritics with dead keys or AltGr), selection replacement, and undo keep the mirror identical to the value (e2e or a manual check documented).
- **AC-3** Screen readers announce the control normally. The mirror is never announced.
- **AC-4** Reduced motion and forced colours show native text with no mirror.
- **AC-5** A long single-line input scrolls horizontally with the caret, and the mirror follows (no misaligned text).

## Validation

```
pnpm verify
pnpm --filter @portfolio/web dev   # /__showcase
```

## Definition of done

Standard DoD plus a short screen recording or GIF (optional) or a frame sequence in the report.
