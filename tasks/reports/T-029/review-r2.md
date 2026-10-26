# T-029 review, round 2 (pre-merge fixups)

- **Reviewer:** orchestrator (Opus)
- **Verdict:** APPROVED (round 1 was APPROVED)

| Finding                                          | Status                                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| R1-01 MINOR CLS on deep link with a long quote   | Accepted as the AC-6 note (within "good"; reserving more height would deviate from the design). |
| R1-02 NIT unnamed focus target after "Try again" | Fixed: the quote stage is `role="group"` labelled "THE LAST VISITOR SAID".                      |
| R1-03 NIT token suffix                           | Renamed `-max-w` → `-max`; documented in `design-system.md` §2.5.                               |
| R1-04 NIT test leftovers                         | Removed.                                                                                        |

Gate C on the squash-merged tree: `pnpm verify` green (web 285 tests); full `pnpm test:e2e` 43 passed / 23 skipped (parity specs run only with `E2E_EDGE=wrangler`), on alternate ports because a WSL relay holds :3000. Integration fix in this merge: the T-030 contact spec's `getByLabel('MESSAGE')` became ambiguous next to the guestbook's "Your message" field; made `exact`.
