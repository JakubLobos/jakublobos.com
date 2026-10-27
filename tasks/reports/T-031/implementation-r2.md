# T-031: Implementation report, round 2

- **Branch:** `task/T-031-scrollbar` (merged with current `main`)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: `TRACK_INSET` removed. `lib/scrollbar.ts` functions now take the track length first; `custom-scrollbar.ts` passes `this.clientHeight` (render and track click), so CSS `--space-14` is the only source. Tests use a plain `TRACK` constant. |
| R1-02   | fixed: grip gap and the three grip widths moved to `--sb-grip-gap` / `--sb-grip-1..3` in the local custom-property block.                                                                                                                          |
| R1-03   | out of scope (`base.css`); logged by the orchestrator.                                                                                                                                                                                             |
| R1-04   | fixed: dropped the redundant track-12 and reverse-full-travel assertions; the empty-document guard is its own test.                                                                                                                                |

## Validation

`pnpm verify` re-run after the changes; see the commit message and the orchestrator's summary for results. Not re-checked in a browser (no dev server, per instruction).
