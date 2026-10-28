# T-081 implementation report (r1)

See the PR description. `pnpm verify` green (format, lint, typecheck, test, build, budgets: JS 18.1/35 KB, CSS 13.5/25 KB). Throwaway Playwright run against astro preview :4416 confirmed clipboard text, tag show/leave, live region, rejected-clipboard mailto fallback, Ctrl+click untouched, reduced motion, axe clean (color-contrast excluded as in e2e). e2e/ has no mailto assertions.
