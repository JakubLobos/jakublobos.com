# T-026: Implementation report, round 1

- **Branch:** `task/T-026-experience` (merged with current `main`; commits `e9459ef` + merge `e0fc8f0` + report commit)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

The Experience stub is filled: the markup is the stacked compact layout (no-JS baseline, rail hidden), and the `<experience-timeline>` custom element enhances it to a sticky stage when JS is on and the viewport is not compact (`breakpoints.compactExperience`, re-evaluated on `change`). Scroll progress to active index lives in the pure `lib/timeline.ts`; the script only measures once per animation frame and writes `data-mode`, `data-position`, `aria-current` and `--exp-fill`/`--exp-count`. All visual state is CSS keyed off those attributes.

## Files changed

| File                                                | Change                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/web/src/components/sections/Experience.astro` | modified: markup, styles (stub filled; `id="experience"` kept)                               |
| `apps/web/src/scripts/experience-timeline.ts`       | added: custom element (sticky enhancement, rAF-throttled passive listeners, cleanup)         |
| `apps/web/src/lib/timeline.ts` + `timeline.test.ts` | added: `progress`, `activeIndex`, `fillFraction`, `positionOf`, `scrollTargetFor` + 12 tests |
| `apps/web/src/content/experience.ts`                | added: 3 entries, EN verbatim, PL draft                                                      |
| `apps/web/src/i18n/messages/experience.ts`          | added: eyebrow, title, rail label, kind labels (EN + PL)                                     |
| `tasks/reports/T-026/screenshots/*.png`             | added: 1440/1024 steps 1-3, 768/390 compact                                                  |

## Acceptance criteria

| #    | Criterion (short)        | Status                 | Evidence                                                                                                                                                                                                                                                                                                                        |
| ---- | ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Steps 1-3 at 1440/1024   | pass                   | `screenshots/1440-step{1,2,3}.png`, `1024-step{1,2,3}.png`. Playwright state: fill `0 / 0.5 / 1`, positions `active,after,after` → `before,active,after` → `before,before,active`. 1440 step 2 matches `desktop-1440-experience-step2.png` by eye (dot, rail, panel at same coordinates). Wrapper height 2340px = 260vh at 900. |
| AC-2 | Compact at 768/390       | pass                   | `768-compact.png`, `390-compact.png` (mode `null`, all entries visible, `KIND · DATE`). Resize 1440 → 700 → 1440 toggles `sticky` → none → `sticky` with positions reset and restored.                                                                                                                                          |
| AC-3 | No JS                    | pass                   | Playwright `javaScriptEnabled: false`: rail `display:none`, 3 panels opacity 1, all 3 titles present in document order.                                                                                                                                                                                                         |
| AC-4 | Keyboard                 | pass                   | Playwright: click on step 3, Enter on step 2, Space on step 1 each scroll and update `aria-current="step"` and the panel (output below). Focus ring is the global `:focus-visible` (not visually re-captured here).                                                                                                             |
| AC-5 | `lib/timeline.ts` ≥ 90 % | pass (by construction) | 12 tests cover every function and branch: `p = 0`, `p = 1`, `n = 1`, `n = 0`, zero travel, round trip. No coverage run was made (web has no coverage script).                                                                                                                                                                   |

## Validation output

```
$ pnpm verify          -> exit 0
  web tests 197 passed (13 files); server 314; contracts 153; astro check 0 errors; build OK
$ vitest run src/lib/timeline.test.ts -> Tests 12 passed
$ playwright-core (temporary, outside repo) against `astro dev`:
  nojs   {"mode":null,"railDisplay":"none","panelOpacity":["1","1","1"]}
  click 3   steps ["before","before","active*"] panels opacity [0,0,1]
  Enter on 2 steps ["before","active*","after"]
  Space on 1 steps ["active*","after","after"]
  reduced motion: panel transition-duration "0s" (0.35s otherwise)
```

## Tests added

- `apps/web/src/lib/timeline.test.ts`: progress clamping and linearity, no divide-by-zero, `activeIndex` slicing and `p = 1`/`n = 1`/`n = 0`, `fillFraction`, `positionOf`, `scrollTargetFor` including a round trip through `progress`/`activeIndex`. Markup and the custom element are intentionally untested (owner's token budget; covered by the T-040 e2e).

## Screenshots

`tasks/reports/T-026/screenshots/` at 1440 and 1024 (steps 1-3) and 768 and 390 (compact). 390 and 768 are compact by the breakpoint, so there is no mid-scroll state there; 1440/1024 step 2 is the mid-scroll state. The dark pill in some shots is the Astro dev toolbar.

## Assumptions

- Org name for the rail uses a non-localized proper noun (`org`); `WSB-NLU, Nowy Sącz` is the same in PL.
- Rail org text uses `--text-field` (17px = design) with `--leading-title` (1.35), since no dedicated 17px/1.35 token exists.
- Runtime attributes (`data-mode`, `data-position`) are written as `:global([...])` in the component styles so `astro/no-unused-css-selector` (which only sees the template) does not flag them.
- Rail geometry (dot 11px, scale 1.3, track offsets, 280px column, 600px bullets) sits in a local custom-property block on `experience-timeline`, per design-system §3.1 illustration-geometry allowance.
- Reduced motion drops all transitions and the ±16px slide (inactive panels are simply opacity 0). Clicking a rail step calls `scrollTo` without `behavior`, so `html { scroll-behavior }` decides (smooth only without reduced motion).
- Forced colours: dots fill with `CanvasText` for before/active, the active org is underlined, the fill uses `CanvasText`; `aria-current="step"` carries the meaning for AT.

## PL content for owner review (D-02)

Dates `2023 — obecnie`, `paź 2023 — lut 2027`; eyebrow `DOŚWIADCZENIE`, title `Gdzie pracuję`, rail label `Oś czasu doświadczenia`, kind `DOŚWIADCZENIE` / `WYKSZTAŁCENIE`; all titles, subs and 8 bullets in `content/experience.ts` (`pl`) are drafts, including `Inżynier (inż.) informatyki` for the degree.

## Deviations from spec or design

- None intended. Note for the design record: the meta label (12px, in the paint colour) and inactive rail text (`--color-text-faint`, approved for this use in design-system §2) are below 4.5:1 contrast. They follow the design; axe may flag them in T-040, which would need a decision (D-01 style).

## Change Requests

- None.

## Open issues and follow-ups

- Colour contrast risk above (meta label colours, faint inactive entries).
- A stray `astro dev` I started on port 4351 was killed by the host's memory reaper; the surviving server process was stopped by PID. Ports are free. Lint on a fresh worktree needs `astro sync` first (types for `import.meta.env`); unrelated to this task.
