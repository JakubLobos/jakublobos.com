# T-029: Implementation report, round 2

- **Branch:** `task/T-029-guestbook-ui` (`main` merged in, no conflicts)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | accepted as the AC-6 note, no height change (a taller reserve would deviate from design-analysis §4.11). Reviewer's numbers: a deep link to `/#guestbook` with a 98-character quote shifts the form by 68 px at 1440 (CLS +0.0105) and 51 px at 390 (+0.028); a 60-character quote +0.0021. All within "good"; the 600 px preload hides it in normal scrolling. |
| R1-02   | fixed: the stage is now `role="group"` labelled by the "THE LAST VISITOR SAID" label (`aria-labelledby`), so the focus target after "Try again" has a name and is announced.                                                                                                                                                                                    |
| R1-03   | fixed: `-max-w` renamed to `-max` (`--guestbook-visitor-max`, `--guestbook-form-max`, `--guestbook-modal-max`, `--guestbook-modal-copy-max`) in `tokens.css` and the three components.                                                                                                                                                                          |
| R1-04   | fixed: the leftover `vi.useRealTimers()` calls are removed from `client.test.ts` and `guestbook.test.ts`, and the trivial `tintValue` case is dropped from `guestbook-paint.test.ts` (the helper itself stays).                                                                                                                                                 |

## Notes

- Reviewer's note for the orchestrator: the seven CR-1 tokens are not yet listed in `docs/design-system.md` §3 (shared surface; not edited here).

## Validation output

See the final reply (`pnpm verify`, `pnpm test:e2e e2e/guestbook`).
