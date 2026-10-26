# T-040: Implementation report, round 2

- **Branch:** `task/T-040-e2e-harness`
- **Status claimed:** READY_FOR_REVIEW

## Summary

Review fixup: `reuseExistingServer` was `!CI`, which silently adopted any server on :3000/:8787 (for example a dev API with the real `.env`). It is now `false` for both servers unless `E2E_REUSE=1` is set, so the suite fails fast with "port already used". README testing note updated. Merged `main` and ran `pnpm install --frozen-lockfile` first.

## Files changed

- `playwright.config.ts`: `reuseServers = process.env.E2E_REUSE === '1'` used by both `webServer` entries.
- `README.md`: documents the behaviour and the opt-in.

## Validation

`pnpm verify`: exit 0 (contracts 153, server 340, web 204 tests passed); e2e not re-run (ports occupied by other agents, per the orchestrator).
