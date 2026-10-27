# T-021 review, round 2 (pre-merge fixups)

- **Reviewer:** orchestrator (Opus)
- **Verdict:** APPROVED (round 1 was APPROVED; this checks the fixups and the rebase)

| Finding                               | Status                                                                                                                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01 MINOR skip link hidden on focus | Fixed: `--z-skip` token (tested), `SkipLink` sits above `.page`.                                                                                                                                           |
| R1-02 NIT hand-written `.env` parser  | Fixed: `node:util` `parseEnv` on the root `.env`, `PUBLIC_` filter, why-comment on `.env.<mode>`. `@types/node@24.19.2` declared in `apps/web` so TypeScript never resolves typings from outside the repo. |
| R1-03 NIT constant-restating tests    | Removed.                                                                                                                                                                                                   |

Orchestrator rulings from round 1: the `path` prop, the env loading, and the single JSON-LD `set:html` exception (recorded in AGENTS rule 5 and `security.md` §3) are accepted. Gate C: `pnpm verify` on the squash-merged tree.
