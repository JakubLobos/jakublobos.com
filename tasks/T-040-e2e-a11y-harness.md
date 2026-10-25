# T-040: End-to-end and accessibility test harness (production topology)

|                          |                           |
| ------------------------ | ------------------------- |
| **Wave**                 | 4                         |
| **Depends on**           | T-011, T-016, T-021       |
| **Blocked by decisions** | none                      |
| **Parallel with**        | T-014, T-023…T-028, T-031 |
| **Size**                 | M                         |
| **Requirements**         | NFR-02, NFR-05, NFR-09    |

## Objective

Stand up Playwright + axe against the **production topology**:

- the built site served by `wrangler dev` (static assets + the real Worker) on :8787
- the real API on :3000 with fake providers and a temp DB

Shared guards catch console errors, CSP violations, and unexpected external network calls, so every later UI task can add specs.

## References

- `docs/testing.md` §1, §4, §8
- `docs/decisions/0013-testing-toolchain.md`, `0014-hosting-cloudflare-workers-and-railway.md`
- `docs/security.md` §5

## Scope

- Root dev deps; root `playwright.config.ts`:
  - projects `chromium-desktop` (1440×900), `chromium-mobile` (390×844, touch), `webkit-desktop`; `firefox` opt-in
  - `webServer`: **two** entries:
    1. the API: `node apps/server/src/main.ts` with `NODE_ENV=test`, `PORT=3000`, `MODERATION_PROVIDER=fake`, `SUITABILITY_PROVIDER=fake`, `MAILER=console`, `DATABASE_PATH=<unique tmp>`, `CORS_ALLOWED_ORIGINS=http://localhost:8787`, `CLIENT_IP_SOURCE=socket`; waits for `/api/health`
    2. the site: build with `PUBLIC_API_BASE_URL=http://localhost:3000` and `PUBLIC_SITE_URL=http://localhost:8787`, then `wrangler dev --port 8787` in `apps/web`
  - `baseURL: http://localhost:8787`; `reuseExistingServer: !process.env.CI`; trace on first retry
- `e2e/fixtures.ts`:
  - an extended `test` failing on `console.error`, `pageerror`, `securitypolicyviolation`
  - a **network guard**: allow only `localhost:8787` and `localhost:3000`; intercept known analytics hosts with local stub responses (to be used by T-032/T-041); fail on anything else
  - helpers `expectNoA11yViolations(page, opts)` (wcag2a/aa, 21a/aa, 22aa; serious and critical fail) and `gotoLocale(page, locale, path)`
- `e2e/smoke.spec.ts` (`@smoke`):
  - `/`, `/pl`, `/privacy`, `/pl/privacy`, `/nope`, `/pl/nope`: load, correct `html[lang]` and status, no errors or CSP violations, axe clean
  - `/` with `Accept-Language: pl` → `/pl`
  - `/set-language?lang=en&to=/` → cookie set, `/` stays English
- `e2e/tsconfig.json`, `tools/tsconfig.json` (ESLint projectService coverage).
- Root scripts `test:e2e`, `test:e2e:ui`. Add `e2e/visual/compare/` to `.gitignore`. README testing section: `pnpm exec playwright install --with-deps chromium webkit`.

## Allowed files

`playwright.config.ts`, `e2e/**`, `tools/tsconfig.json`, root `package.json` (scripts + dev deps), `pnpm-lock.yaml`, `.gitignore` (one line), `README.md` (testing subsection).

## Dependencies (exact)

Root dev: `@playwright/test@1.64.1`, `@axe-core/playwright@4.14.0`.

## Acceptance criteria

- **AC-1** `pnpm test:e2e` starts both servers, runs the smoke suite on the 3 default projects, and passes.
- **AC-2** An injected inline script or `style=` (local experiment, not committed) fails the CSP guard. Report it.
- **AC-3** Each run uses a fresh temp DB and leaves no files in the repo.
- **AC-4** Any request to an unlisted external host fails the test.
- **AC-5** A CORS regression (API started without `http://localhost:8787` in the allowlist) makes the smoke test fail with a clear message (local experiment).

## Validation

```
pnpm verify
pnpm exec playwright install --with-deps chromium webkit
pnpm test:e2e
```

## Definition of done

Standard DoD.
