# T-032: Implementation report, round 2

- **Branch:** `task/T-032-consent` (main merged first)
- **Status claimed:** READY_FOR_REVIEW

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed, with one product trade-off (below). The SDK is now `posthog-js/dist/module.slim` (same package and version). Lazy analytics total is **50.7 KB gzip** (limit 80 KB): SDK 50,847 B, PostHog adapter 467 B, GA4 adapter 441 B, driver 176 B. Previously 103 KB. The banner script on every page is 1,942 B gzip.                                                                                                  |
| R1-02   | fixed. `apply()` calls `opt_in_capturing()` only when `has_opted_in_capturing()` is false. Unit test: a visitor who is already opted in gets no `opt_in` call.                                                                                                                                                                                                                                                         |
| R1-03   | fixed. On withdrawal, after `opt_out_capturing()`, the `ph_*` sessionStorage keys are removed (an injected `clearSessionStorage`, so `lib/` stays DOM-free). The withdrawal e2e asserts the storage was populated before, and that afterwards localStorage, sessionStorage and cookies hold nothing but `__ph_opt_in_out_<key>`, also after a reload; the first page view after withdrawal carries `$cookieless_mode`. |
| R1-04   | fixed. The ID checks are inline and constant-foldable. Verified: a build with the IDs empty has no `module.slim`, `posthog`, `ga4` or `driver` chunk, and no `posthog`/`gtag`/`requestIdleCallback` string anywhere in `dist/_astro` or the HTML. With IDs set, all four chunks are emitted.                                                                                                                           |
| R1-05   | fixed. `SITE` from `./ports.ts` replaces the hard-coded origin; the contradictory header comment is rewritten.                                                                                                                                                                                                                                                                                                         |
| R1-06   | fixed. Dropped the duplicate "starts from storage" case and the constant re-assertion in `consent.test.ts`. `common.cookieNotice` is deleted (EN and PL).                                                                                                                                                                                                                                                              |

## R1-01 trade-off for the owner: autocapture

The slim build contains no autocapture, so **clicks are no longer captured; page views are**. I tried keeping autocapture through the package's `extension-bundles` entry: it is not tree-shakeable (one pre-bundled file with its own copy of the core), and the lazy total became about 110 KB gzip (slim 50.8 KB + bundle 58.4 KB), over budget. The unbundled `lib/src` is CommonJS, so it cannot be tree-shaken either. If click tracking matters more than the 80 KB budget, that is an owner decision (it needs the budget raised or the bundle accepted); I did not raise anything. `autocapture: false` is set explicitly, so input values, form submissions and clicks are never captured.

## Validation

See the commit message of the final commit and the reply: `pnpm verify` exit 0; `E2E_API_PORT=3110 E2E_SITE_PORT=8807 pnpm test:e2e e2e/consent`: 30 passed (10 tests x chromium-desktop, chromium-mobile, webkit-desktop).
