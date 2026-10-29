# T-024: Implementation report, round 2

- **Branch:** `task/T-024-hero` (main merged in; round 1 was APPROVED, these are pre-merge fixups)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1-01   | fixed: `implementation-r1.md` rewritten as UTF-8 without a BOM (PASS and the PL strings restored); header SHA now `0143151`.                                                                                                         |
| R1-02   | doc fix by the orchestrator (`design-system.md` §3 rule 8); no code change.                                                                                                                                                          |
| R1-03   | fixed: `scripts/mascot.ts` reads `--duration-blink` with `getComputedStyle` at blink time (`parseFloat`, token is in ms) and falls back to 180 ms if it is missing or not positive. `BLINK_DURATION_MS` removed from `lib/pupil.ts`. |
| R1-04   | fixed: the four overlapping clamp rows replaced by one far-diagonal case; the exact 175 px boundary test stays.                                                                                                                      |
| R1-05   | fixed: `--measure-intro` renamed `--intro-max`; it and `--divider-w` moved into the Layout group of `tokens.css`; `Hero.astro` updated.                                                                                              |

## Other changes

- Merged `main` (T-014 and later) into the branch with no conflicts, then `pnpm install --frozen-lockfile` (already up to date).

## Validation output

`pnpm verify`: exit 0 (format, lint, typecheck, build clean). apps/web 7 files / 105 tests passed (3 fewer than round 1 after R1-04); apps/server 28 files / 314 tests passed.
