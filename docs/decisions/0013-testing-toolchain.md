# ADR-0013: Testing toolchain

- **Status:** Accepted · **Date:** 2026-10-25 · **Related:** NFR-09, testing.md

## Decision

- **Vitest 5.0.5** for unit and integration tests in every package (Astro's recommended runner; `getViteConfig()` for web). V8 coverage.
- **supertest 7** for HTTP integration tests against `createApp(deps)`.
- **Real SQLite** (`:memory:` or a temp file) in tests. Never mock the DB.
- **Playwright 1.64** for e2e against the production topology: the built site + real Worker under `wrangler dev` (:8787) and the real API (:3000) with fake providers and a temp DB. **@axe-core/playwright 4.14** for accessibility.
- **Worker logic** (negotiation, `/set-language`) is unit-tested with Vitest in Node using standard `Request`/`Response` and a stub `ASSETS` binding.
- Visual: side-by-side review against the design, then committed implementation baselines (`toHaveScreenshot`) after owner sign-off.

## Alternatives considered

| Option                                              | Why not                                                                                                                                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jest                                                | Slower ESM/TS story; Vitest shares Vite config with Astro                                                                                                                               |
| jsdom/happy-dom component tests for custom elements | Behaviour depends on layout, scroll, and pointer, which DOM emulators don't do well; logic is extracted to `lib/` (Node tests) and behaviour is verified in a real browser (Playwright) |
| Pixel-diff against `design.html`                    | The prototype is animated and non-deterministic; it would produce noise rather than signal                                                                                              |
| Lighthouse CI service                               | Heavy for one page; a budget script plus manual or CLI Lighthouse is enough                                                                                                             |

## Sources

- Astro testing guide: https://docs.astro.build/en/guides/testing/ (accessed 2026-10-25); versions from the npm registry on the same date.
