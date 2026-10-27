# T-022: Implementation report, round 1

- **Branch:** `task/T-022-ui-primitives`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Built the UI primitives (`Button`, `ChromeButton`, `SectionHeading`, `Highlight`, `Spinner`, `CheckIcon`), the decor components (`PaintDrips`, `CookieIcon`) and `lib/paints.ts`, and added every variant and state to the dev showcase. All copy comes in via props or slots; all values are tokens (CR-1 added the missing control tokens).

## Files changed

| File                                                                                                | Change                                                              |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `apps/web/src/components/ui/{Button,ChromeButton,SectionHeading,Highlight,Spinner,CheckIcon}.astro` | added                                                               |
| `apps/web/src/components/decor/{PaintDrips,CookieIcon}.astro`                                       | added                                                               |
| `apps/web/src/lib/paints.ts`, `paints.test.ts`                                                      | added: `PAINTS` (`swatchVar`, `tintVar`, `labelKey`), `PAINT_ORDER` |
| `apps/web/src/dev/showcase.astro`                                                                   | modified: new sections appended, plus their local styles            |

## Acceptance criteria

| #    | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | pass   | `screenshots/showcase-1440.png`, `showcase-390.png`. Measured in Chrome at 1440 against `docs/design/screenshots/desktop-1440-hero.png` and `…contact-loading.png`: "Reach me out" 159 x 47 (design 159 wide, 47 + 6 shadow), "Get my resume" 170 x 47 (design 171), form buttons 210 x 52, small 44 high, chrome 44 high; Ubuntu 500 17/15/16 px, radius 8, shadows `0 6px / 4px` in edge/ink colours, busy `0 2px` and `translateY(4px)`, sent yellow with ink edge. I compared against the screenshots by eye, not with a pixel diff. |
| AC-2 | pass   | Global `:focus-visible` ring (T-020) applies; no component removes it. `href` renders `<a>` without `role`; otherwise `<button type>`. Not tested interactively beyond Tab order in the showcase.                                                                                                                                                                                                                                                                                                                                        |
| AC-3 | pass   | Playwright with `reducedMotion: 'reduce'`, mouse down on primary: `transform: none`, shadow unchanged, colour change kept. With motion: hover `matrix(1,0,0,1,0,-2)` + `0 8px`, active `translateY(5px)` + `0 1px`.                                                                                                                                                                                                                                                                                                                      |
| AC-4 | pass   | `paints.test.ts` "covers exactly the contract paint IDs, in order".                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Validation output

```
$ pnpm verify
prettier: All matched files use Prettier code style!
eslint: clean
typecheck (astro check): 0 errors, 0 warnings, 0 hints
tests: contracts 153, server 93, web 71 passed
build: 2 page(s) built, Complete!
$ rg "#[0-9a-fA-F]{3,8}\b|rgba?\(" apps/web/src --glob '!tokens.css' --glob '!tokens.test.ts'
(no matches)
```

## Tests added

- `lib/paints.test.ts`: parity of `PAINT_ORDER` and `PAINTS` keys with contract `PAINT_IDS`; variable and label naming per ID.

## Screenshots

`tasks/reports/T-022/screenshots/showcase-1440.png` and `showcase-390.png` (full page, new sections at the bottom). Dark pill, if any, is the Astro dev toolbar (hidden in these shots).

## Assumptions

- `busy` renders a native `disabled` + `aria-busy` (design "sending"). `disabled` renders `aria-disabled` only (stays focusable) and uses the design's "sent" look (yellow, ink edge), since that is the only disabled appearance in the design. Both apply to `<button>` only; links ignore them.
- Press movement (translate and shadow change) is wrapped in `prefers-reduced-motion: no-preference`; colour change stays. Busy and sent looks are static and unconditional.
- `Highlight`: band ends at 92 % (design uses 90 % for the hero "figma" and 92 % elsewhere; a 2 % difference is about half a pixel). `tint` accepts `'marker'` or a paint ID; runtime changes override `--tint` through CSSOM.
- `SectionHeading.titleMaxWidth` is `520 | 640` (the two values in the design); 640 also carries `text-wrap: balance` as in the guestbook heading. Extra props (`id`, plus attributes on `Button`/`ChromeButton`) pass through for later tasks.
- `PaintDrips` positions itself as in the design (`top` fixed, `menu`/`modal`/`bottom` absolute); the bottom strip scales to 0.6 under 760 px. Hidden in forced-colors mode.
- `labelKey` is `guestbook.paint.<id>`; T-029 owns the copy.

## Deviations from spec or design

None known.

## Change Requests

- **CR-1: accepted by the orchestrator and applied.** A "controls" group was appended to `tokens.css` (inside the single `:root` block, which `tokens.test.ts` requires) and the local literals and borrowed-by-number tokens in `components/ui/*` now use it. New tokens: `--text-button-lg` (alias of `--text-field`), `--text-button-sm` (alias of `--text-body`), `--space-18`, `--control-min-h`, `--control-submit-w`, `--control-submit-h`, `--lift-sm-hover`, `--sink-sm-active`, `--busy-press`, `--busy-sink`, `--icon-spinner`, `--icon-check`, `--icon-menu-w`, `--icon-menu-w-short`, `--icon-close`, `--title-max-narrow`, `--title-max-wide`. `tokens.test.ts` does not enumerate tokens, so it is unchanged. No pixel literals remain in `components/ui`.

## Open issues and follow-ups

- No automated visual or keyboard test (only the spec-required parity test); verification was manual in the showcase.
- Showcase "top" drips use a transformed container so the fixed strip stays inside its card.
