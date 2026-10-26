# T-016 review, round 2 (pre-merge fixups)

- **Reviewer:** orchestrator (Opus)
- **Verdict:** APPROVED (round 1 was APPROVED; this checks the fixups and the rebase)

| Finding                              | Status                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1-01 stale branch                   | Merged main; `apps/server/package.json` keeps `test:coverage` and `preview:topology`.                                                                        |
| R1-02 asset fallback without headers | Fixed: wrapped with `withHeaders`; test flipped.                                                                                                             |
| R1-03 Worker not type-checked        | Fixed: web `typecheck` runs `tsc -p worker/tsconfig.json`.                                                                                                   |
| R1-04…R1-08 NITs                     | Fixed: no-op exclude removed, duplicate rows removed, `/*.html` rule fixed, conditional headers forwarded (`new Request(url, request)`), emulator logs 500s. |

Docs (orchestrator, on main): emulator vs `wrangler dev` wording in architecture §2/§6 and ADR-0007; `.wrangler/` ignored. Real-workerd parity checks are listed for T-051 in `tasks/README.md`. Gate C: `pnpm verify` on the squash-merged tree.
