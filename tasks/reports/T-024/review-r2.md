# T-024 review, round 2 (pre-merge fixups)

- **Reviewer:** orchestrator (Opus)
- **Verdict:** APPROVED (round 1 was APPROVED; this checks the fixups)

| Finding                                     | Status                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| R1-01 MINOR garbled report                  | Fixed: UTF-8 without BOM, SHA corrected.                                                    |
| R1-02 MINOR mascot hidden in forced colours | Doc fix on main: `design-system.md` §3 rule 8 now names the mascot.                         |
| R1-03 NIT duplicated blink duration         | Fixed: read from `--duration-blink` at runtime, 180 ms fallback.                            |
| R1-04 NIT overlapping tests                 | Trimmed.                                                                                    |
| R1-05 NIT token naming                      | `--intro-max` and `--divider-w` in the Layout group; documented in `design-system.md` §2.5. |

Follow-up for T-023: the footer needs `position: relative; z-index: var(--z-content)` so the bottom drips sit behind it (AC-3). Gate C: `pnpm verify` on the squash-merged tree.
