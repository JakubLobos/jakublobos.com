# T-026: Implementation report, round 2

- **Branch:** `task/T-026-experience` (merged with current `main`)
- **Status claimed:** READY_FOR_REVIEW

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed (D-27): added `--paint-red-text`, `--paint-violet-text`, `--paint-blue-text` to `tokens.css` (and the expected map in `tokens.test.ts`). The panel meta label now uses `--entry-text` (`var(--paint-<id>-text)`), defined for the three paints the content uses. Dots and the rail keep the raw paints (fills). |
| R1-02   | fixed: inactive rail entries use `--color-text-muted`. The forced-colours underline on the active entry is unchanged.                                                                                                                                                                                                 |
| R1-03   | fixed: `--fill-radius: 2px` and `--fill-duration: 80ms` added to the local geometry block; the fill uses them instead of `--space-2` and a literal duration.                                                                                                                                                          |

## Validation

`pnpm verify` exit 0: web 219 tests, server 340, contracts 153, `astro check` 0 errors, build OK. No visual re-check (colour-only change; no dev server started).
