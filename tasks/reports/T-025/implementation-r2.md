# T-025: Implementation report, round 2

- **Branch:** `task/T-025-marquee`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

Merged `main` (T-014, T-016) before starting.

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                       |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: the button has one constant label ("Pause animation" / "Zatrzymaj animację"); `aria-pressed` carries the paused state. Removed the `label-play` span, the `play` messages (EN and PL) and the label-swap CSS.                                                             |
| R1-02   | fixed: the section height is now `--band-section-h` in the decor custom-property block.                                                                                                                                                                                          |
| R1-03   | fixed: under `forced-colors: active`, `.band[data-band] .dot` gets `forced-color-adjust: none; background: CanvasText`. The selector matches the specificity of the band B dot colour rule so it wins in that mode. Not browser-tested (no forced-colors emulation in this run). |

## Validation

`pnpm verify` exit 0: prettier clean, astro check 0 errors, tests 153 + 314 + 178 passed, build 6 pages.
