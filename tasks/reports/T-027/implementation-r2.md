# T-027: Implementation report, round 2

- **Branch:** `task/T-027-projects-skills`
- **Status claimed:** READY_FOR_REVIEW (pre-merge fixup after APPROVED r1)
- **Agent / model:** claude-sonnet-5-5

## Summary

Pre-merge fixup requested by the orchestrator: renamed `--list-index-col` / `--list-index-gap` to `--project-index-col` / `--project-index-gap`, since only Projects uses them. Merged `main` into the branch; the `tokens.css` conflict was resolved by keeping both token groups (T-027 row geometry and T-023 navigation pills).

## Files changed

| File                                              | Change                                 |
| ------------------------------------------------- | -------------------------------------- |
| `apps/web/src/styles/tokens.css`                  | modified: renamed the two index tokens |
| `apps/web/src/components/sections/Projects.astro` | modified: uses the renamed tokens      |

## Validation output

`pnpm install --frozen-lockfile` and `pnpm verify`: see the result below.

The dev server on port 4330 that I started earlier was stopped (my own PID only); the port is free.
