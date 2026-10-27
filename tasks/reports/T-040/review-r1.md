# T-040 review, round 1

- **Reviewer:** orchestrator (Opus); harness/config task, reviewed directly
- **Verdict:** APPROVED (one required fix applied in round 2)

Checked `playwright.config.ts`, `e2e/fixtures.ts`, `e2e/smoke.spec.ts`, `e2e/contrast.spec.ts` against the spec and `docs/testing.md` §1:

- Topology: real API on :3000 (`NODE_ENV=test`, fake providers, console mailer, `HUMAN_VERIFIER=fake`, `CONTACT_PHONE=+48000000000`, temp DB in the OS temp dir, removed on exit) and the built site via the Node edge emulator on :8787; `E2E_EDGE=wrangler` switch for CI.
- Projects: Chromium desktop 1440×900, Chromium mobile 390×844, WebKit desktop; Firefox opt-in.
- Fixtures: CSP violation, external-request and console-error guards; axe helper fails on serious/critical.
- Contrast: axe can't resolve backgrounds over the page grid, so `contrast.spec.ts` asserts WCAG ratios for the token pairs in `tokens.css` (added at the orchestrator's request).
- Implementer's run: 27 passed, 3 justified skips (contrast spec runs once; WebKit drops `Secure` cookies on `http://localhost`).

| ID    | Severity | Finding                                                                                                                                  | Status                                                      |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| R1-01 | MAJOR    | `reuseExistingServer: !CI` silently reuses any process on :3000/:8787 (e.g. a dev API with the real `.env` and DB), invalidating results | Fixed in r2: off unless `E2E_REUSE=1`; README documents it. |

Accepted: root `tsconfig.json` limited to `playwright.config.ts` (ESLint projectService coverage). Gate C: `pnpm verify` on the squash-merged tree; the e2e suite is re-run on main once :8787 is free (held by an orphaned agent process).
