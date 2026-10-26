# T-016: Implementation report, round 2

Review r1: APPROVED with pre-merge fixups. All findings addressed.

| Finding | Resolution                                                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: merged `main`; `apps/server/package.json` keeps both `test:coverage` and `preview:topology`.                                     |
| R1-02   | fixed: the non-`/` fallback in `worker/index.ts` is wrapped in `withHeaders`; the test now asserts the security headers.                |
| R1-03   | fixed: web `typecheck` is `astro check && tsc -p worker/tsconfig.json`, so `pnpm verify` type-checks the Worker.                        |
| R1-04   | fixed: removed the no-op `worker/tsconfig.json` exclude from `apps/web/tsconfig.json`.                                                  |
| R1-05   | fixed: dropped the three matrix rows and the cookie-override test from `negotiate-locale.test.ts`; the matrix stays in `index.test.ts`. |
| R1-06   | fixed: removed the dead `/*.html` rule from `CACHE_RULES`; per-page rules carry `no-cache`.                                             |
| R1-07   | fixed: the ASSETS request for `/` is `new Request(new URL('/', request.url), request)`, forwarding conditional headers.                 |
| R1-08   | fixed: the emulator logs the error with `console.error` before answering 500.                                                           |

`.wrangler/` in `.gitignore` and the architecture/ADR-0007 updates are left to the orchestrator, as instructed.
