# T-051 review, round 1

- **Reviewer:** orchestrator (Opus); workflow/config task, reviewed directly
- **Verdict:** APPROVED

Checked `.github/workflows/{ci,deploy-site,nightly}.yml`, `.github/actions/{setup,playwright}/action.yml`, `e2e/edge-parity.spec.ts`:

- CI: `verify` → `e2e` (Chromium + WebKit, report on failure) and `edge-parity` (real `wrangler dev`, `@smoke|@parity`, report always kept); `audit` (`pnpm audit --prod --audit-level=high`); concurrency cancels superseded runs.
- Deploy: site inputs on `main` or manual dispatch; the `ci.yml` gate via `workflow_call`; `production` environment; serialised; `PUBLIC_*` from repository variables, `CLOUDFLARE_*` secrets by name only; a non-`main` dispatch can't deploy.
- Hardening: actions pinned by SHA, `permissions: contents: read`, `persist-credentials: false`, no secrets in CI.
- Parity spec skips unless `E2E_EDGE=wrangler`; encodes the T-016 emulator assumptions.
- Fixup (706d48e): pnpm version read from the root `packageManager` (added on main), not duplicated in the setup action.

Not verifiable locally: no GitHub Actions run yet (AC-1 pending the first push); real-workerd values unconfirmed. Follow-ups logged in `tasks/README.md` (emulator POST → 405 after first run; custom-domain route; owner GitHub setup). Gate C: `pnpm verify` on the squash-merged tree.
