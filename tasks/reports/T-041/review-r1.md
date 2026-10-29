# T-041 review, round 1 (orchestrator)

**Verdict: APPROVED.** Independent gate: the PR's CI `e2e` job (clean runner, real `pnpm test:e2e`).

## Acceptance criteria

- AC-1: every `testing.md` §4 row has a spec; nav/guestbook/contact/consent run on chromium-mobile and webkit-desktop (project-specific skips are justified inline). PASS
- AC-2: `--repeat-each=5` on `@guestbook|@contact`: 230 passed, 0 failed (implementer run); the old "once approved" flake root-caused (random suffix tripped the keyboard-mash rule) and fixed. PASS
- AC-3: 2m53s full suite including build. PASS

## Findings

- R1-01 ACCEPTED deviation `playwright.config.ts`: `CLIENT_IP_SOURCE: 'x-real-ip'` (an existing server option) plus a random `X-Real-IP` per request. It's test-server env only, and the alternative was coupling specs through the per-client limit. Each run uses a fresh temp DB, so the global caps reset per run.
- R1-02 ACCEPTED gap: rejection outcomes aren't observable via the public API. The e2e proves the uniform modal and that only the newest message is published; rejection itself stays covered by the worker unit tests.
- R1-03 ACCEPTED gap: the site is built with an empty Turnstile sitekey (T-030 decision), so the failure path stubs the API's 403 instead of using Turnstile's always-fail key. The real widget is verified at go-live (D-23).
- R1-04 NOTE: the real guestbook journey uses 4 of the 20/hour global cap per run, so `--repeat-each` > 5 would need a test-only cap override.
