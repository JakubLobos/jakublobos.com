# T-042: Visual fidelity pass and regression baselines

|                          |                                                                          |
| ------------------------ | ------------------------------------------------------------------------ |
| **Wave**                 | 6 (run alone among UI-editing tasks: it may touch many component styles) |
| **Depends on**           | all UI tasks (T-023…T-033), T-040                                        |
| **Blocked by decisions** | D-01, D-16 should be answered first (they change visuals)                |
| **Parallel with**        | T-041, T-050, T-051 (not with T-034 or T-043 if they edit components)    |
| **Size**                 | L                                                                        |
| **Requirements**         | NFR-01                                                                   |

## Objective

Systematically compare the implementation with `design.html` at all reference viewports, fix the remaining deviations, get the owner's visual sign-off, and then lock the result with screenshot baselines.

## References

- `docs/testing.md` §5
- `docs/design-analysis.md` (entire), `docs/design/screenshots/`
- `tools/design/capture-design.mjs` (the script that produced the reference screenshots during planning; adapt and extend it)

## Scope

- Extend `tools/design/capture-design.mjs` into a comparison tool:
  - renders `docs/design/design.html` and the built site (`pnpm preview`) at 390×844, 768×1024, 1024×768, and 1440×900 with `reducedMotion: 'reduce'`
  - pins the same scroll anchors and states (hero, each experience step, projects, skills, guestbook idle and modal, contact idle, errors, and success, footer, mobile menu, cookie banner)
  - masks dynamic regions (mascot pupils, marquee)
  - writes side-by-side PNGs to `e2e/visual/compare/` (git-ignored)
- Produce a deviation log `docs/design/fidelity-report.md`: per state and viewport, list deviations with severity, then fix them in the components (CSS-level fixes; behavioural changes need a Change Request).
- After owner sign-off: `e2e/visual/visual.spec.ts` with `toHaveScreenshot()` baselines (Chromium desktop and mobile only, animations disabled, `maxDiffPixelRatio: 0.01`), committed under `e2e/visual/__screenshots__/`.

## Allowed files

`tools/design/**`, `docs/design/fidelity-report.md`, `e2e/visual/**`, style blocks in `apps/web/src/components/**` (style-only edits, each listed in the report), `eslint.config.js` (only to give `tools/design/**` browser globals, if not already present).

## Acceptance criteria

- **AC-1** Side-by-side images exist for every listed state and viewport. The fidelity report shows no open MAJOR deviations.
- **AC-2** Owner sign-off recorded in the fidelity report.
- **AC-3** The visual spec passes on a clean run and fails when a token is altered (demonstrate locally; don't commit).

## Validation

```
pnpm preview & node tools/design/capture-design.mjs --compare
pnpm test:e2e --grep @visual
```

## Definition of done

Standard DoD plus owner sign-off.
