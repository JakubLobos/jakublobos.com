# T-032 review, round 2

- **Reviewer:** orchestrator (Opus), re-review of round 1 findings
- **Verdict:** APPROVED

| Finding                                             | Status                                                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1-01 MAJOR lazy analytics > 80 KB                  | Fixed: posthog-js slim (`dist/module.slim`), lazy total ≈ 50.7 KB gzip (SDK 50,847 B + adapters/driver ≈ 1.1 KB); banner 1,942 B per page. Click autocapture dropped: owner decision D-28. |
| R1-02 MINOR `$opt_in` every page                    | Fixed: only when not already opted in; unit test.                                                                                                                                          |
| R1-03 MINOR PostHog sessionStorage after withdrawal | Fixed: `ph_*` session keys cleared; e2e asserts storage and cookies before and after reload, and that the next event is cookieless.                                                        |
| R1-04 MINOR providers not compiled out              | Fixed: with empty IDs, `dist` has no SDK/adapter/driver chunks and no posthog/gtag strings.                                                                                                |
| R1-05/R1-06 NITs                                    | Fixed: `SITE` from `e2e/ports.ts`, comment, trimmed overlapping tests; unused `common.cookieNotice` removed.                                                                               |

CR-1 (CSP analytics origins) and CR-2 (e2e build env) are accepted; `security.md` §5 updated on main. Gate C: `pnpm verify` and the full e2e suite on the squash-merged tree.
