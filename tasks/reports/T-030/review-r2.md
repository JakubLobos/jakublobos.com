# T-030 review, round 2 (pre-merge fixups)

- **Reviewer:** orchestrator (Opus)
- **Verdict:** APPROVED (round 1 was APPROVED)

| Finding                             | Status                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| R1-01 MINOR raw `300px`             | Tokenised next to `--contact-lead-max`.                                                           |
| R1-02 MINOR missing DoD screenshots | Added (phone failed/revealed at 390 and 1440 with the phone API mocked in-browser; no-JS at 390). |
| R1-03 NIT duplicated tests          | Removed (web tests 257 → 255).                                                                    |
| R1-04 NIT forced-colours link       | "Show number" uses `LinkText`.                                                                    |
| R1-05 NIT no-op attributes          | Removed; script-toggled selectors use `:global()` (same accepted pattern as T-026).               |

Orchestrator changes on main used by this task: Turnstile CSP (CR-1) and the e2e build's empty sitekey pin. E2E `e2e/contact` 9/9 after merging main. Gate C: `pnpm verify` on the squash-merged tree.
