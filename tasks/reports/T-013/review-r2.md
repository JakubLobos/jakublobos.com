# T-013 review, round 2

- **Reviewer:** orchestrator (Opus), re-review of round 1 findings
- **Verdict:** APPROVED

| Finding                                         | Status                                                                                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01 MAJOR combining-mark / soft-hyphen bypass | Fixed: `foldText` (NFKD, strip `\p{M}`/`\p{Cf}`, lowercase, `ł→l`) runs on the whole text before tokenizing; tests for `f̶u̶c̶k̶`, `k̶u̶r̶w̶a̶`, `f\u00ADuck`. |
| R1-02 MINOR fixture scores not tied to policy   | Fixed: `clean` / `high-score` fixtures asserted through `decideModeration`.                                                                           |
| R1-03 NIT `455`→`ass`                           | Fixed; the round 2 version skipped every letterless token (regressing `@$$`), corrected in c855205 to skip only pure-digit tokens, with a `@$$` test. |
| R1-04 NIT modifier counting                     | Fixed: modifiers are removed before the symbol-flood ratio; why-comment and test.                                                                     |
| R1-05 NIT test-kit location                     | Deferred (README follow-up).                                                                                                                          |
| R1-06 NIT unread error bodies                   | Fixed: non-2xx bodies are cancelled.                                                                                                                  |

Gate C: `pnpm verify` on the squash-merged tree.
