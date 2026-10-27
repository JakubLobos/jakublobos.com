# T-018 review, round 2 (pre-merge fixups)

- **Reviewer:** orchestrator (Opus)
- **Verdict:** APPROVED (round 1 was APPROVED; this checks the fixups and the rebase)

| Finding                                              | Status                                                                                                                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01 MINOR production accepts `localhost` hostnames | Fixed: production config rejects `TURNSTILE_ALLOWED_HOSTNAMES` containing `localhost` (also covers unset, whose default is `localhost`); test added. `config.ts` edit approved by the orchestrator. |
| R1-02 NIT redundant fake-verifier tests              | Removed.                                                                                                                                                                                            |
| R1-03 NIT realistic UK number                        | Replaced with a fictional Ofcom drama-range number.                                                                                                                                                 |

`main.ts` keeps T-012 (DB, health ping), T-015 (contact) and adds the phone route. Gate C: `pnpm verify` on the squash-merged tree.
