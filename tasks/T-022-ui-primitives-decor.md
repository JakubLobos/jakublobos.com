# T-022: UI primitives and decorative components

|                          |                             |
| ------------------------ | --------------------------- |
| **Wave**                 | 3                           |
| **Depends on**           | T-020                       |
| **Blocked by decisions** | none                        |
| **Parallel with**        | T-021, backend wave-3 tasks |
| **Size**                 | M                           |
| **Requirements**         | NFR-01, NFR-02              |

## Objective

Build the reusable visual building blocks exactly as designed, so every section uses one implementation of buttons, headings, highlights, icons, and paint drips.

## References

- `docs/design-analysis.md` §4.5 (drips), §4.16 (buttons), §4.6 (highlight), §4.8 (eyebrow and heading), §4.14 (cookie icon), §4.12 (spinner, check icon)
- `docs/design-system.md` §2.7, §2.8, §3
- `docs/design/extracted/design-source.html` L109–110 (buttons), L136–137 (eyebrow and heading), L54–63/L309–318/L383–390 (drips), L327–332 (cookie), L612–613 (spinner, check)

## Scope

- `ui/Button.astro`:
  - props `variant: 'primary' | 'secondary'`, `size: 'lg' | 'sm'`, `href?` (renders `<a>`), `type?`, `disabled?`, `busy?`, `fullWidth?`, `minWidth?: 'form'` (210 × 52 form button)
  - slot for an icon + label
  - hover, active, and focus states per §4.16, with motion gated by reduced motion
  - `aria-busy` and `aria-disabled` support
- `ui/ChromeButton.astro` (Menu/Close style).
- `ui/SectionHeading.astro`: props `index` ("01"), `eyebrow` (localized label), `title`, `as` (`h2` default, `h1`/`h3`), `align: 'start' | 'center'`, `titleMaxWidth?`. The eyebrow renders as `01 — EXPERIENCE`, with the em dash and uppercase from data, not CSS text-transform, to keep copy exact per locale.
- `ui/Highlight.astro`: marker highlight (props `tint` as a token name or paint ID, `pad: 'sm' | 'md'`, clone decoration).
- `ui/Spinner.astro`, `ui/CheckIcon.astro` (`aria-hidden`).
- `decor/PaintDrips.astro`: prop `variant: 'top' | 'bottom' | 'menu' | 'modal'`; exact dimensions per §4.5; `aria-hidden`; colours via paint tokens.
- `decor/CookieIcon.astro`.
- `lib/paints.ts`: `PaintId` (from contracts) → `{ swatchVar, tintVar, labelKey }`, plus `PAINT_ORDER`.
- Add each primitive (all variants and states) to `src/dev/showcase.astro`.

## Out of scope

The mascot (T-024), typing field (T-028), and any section.

## Allowed files

`apps/web/src/components/ui/**` (except `TypingField.astro`), `apps/web/src/components/decor/{PaintDrips,CookieIcon}.astro`, `apps/web/src/lib/paints.ts` (+ test), `apps/web/src/dev/showcase.astro`.

## Implementation notes

- No `style=` attributes. Variants via `class:list` and `data-*`.
- The button's hard-shadow press effect animates `transform` and `box-shadow` only (no layout shift).
- Disabled and busy states keep the design's sending appearance (`design-analysis.md` §4.12).

## Acceptance criteria

- **AC-1** The showcase shows every variant and state. Screenshots at 1440 and 390 next to the design crops (hero CTAs, contact submit states, cookie buttons, menu button) show no visible difference in size, colour, radius, shadow, or font.
- **AC-2** Keyboard focus on every primitive shows the focus ring. The `<a>` and `<button>` renderings are semantically correct (no `role="button"` on anchors).
- **AC-3** With reduced motion there is no translate animation on press. Colour change remains.
- **AC-4** `lib/paints.ts` covers all 6 paint IDs (a test asserts parity with `PAINT_IDS`).

## Validation

```
pnpm verify
pnpm --filter @portfolio/web dev   # /__showcase
```

## Definition of done

Standard DoD plus showcase screenshots in the report.
