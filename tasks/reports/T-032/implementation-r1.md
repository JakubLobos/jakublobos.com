# T-032: Implementation report, round 1

- **Branch:** `task/T-032-consent` (based on `main`, merged twice to pick up T-030, T-029 and the e2e port support)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

A designed cookie banner (`<cookie-banner>`) with persistent, changeable consent (`localStorage['jl-cookies']`), plus a pure consent store, a pure consent-to-provider driver, and two lazily imported adapters: GA4 (gtag.js injected only after "Accept", config in bundled code) and PostHog EU (`cookieless_mode: 'on_reject'`, initialised only once a decision exists). `scripts/analytics.ts` starts on idle, compiles a provider out when its `PUBLIC_*` ID is empty, and drives the adapters from the consent store. The CSP origins are added only when the matching ID is set. One e2e spec covers the privacy behaviour end to end.

## Files changed

| File                                               | Change                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/consent.ts` (+ `.test.ts`)       | added: `ConsentState`, `readConsent`, `writeConsent`, `createConsentStore` (subscribe, notify, cross-tab `refresh`)             |
| `apps/web/src/lib/analytics/driver.ts` (+ test)    | added: consent to provider table (ADR-0011) with ports, tested for every transition                                             |
| `apps/web/src/lib/analytics/ga4.ts` (+ test)       | added: GA4 adapter over an injected host, `expireGaCookies`                                                                     |
| `apps/web/src/lib/analytics/posthog.ts` (+ test)   | added: PostHog adapter, typed init options (`satisfies Partial<PostHogConfig>`)                                                 |
| `apps/web/src/scripts/consent-store.ts`            | added: the page's one store instance (blocked storage tolerated, `storage` event sync). Not in the allowed list, see below      |
| `apps/web/src/scripts/cookie-consent.ts`           | added: `<cookie-banner>` element                                                                                                |
| `apps/web/src/scripts/analytics.ts`                | added: idle-started loader                                                                                                      |
| `apps/web/src/components/site/CookieBanner.astro`  | replaced the T-023 stub                                                                                                         |
| `apps/web/src/i18n/messages/cookies.ts`            | added: EN + PL copy                                                                                                             |
| `e2e/consent.spec.ts`                              | added                                                                                                                           |
| `apps/web/package.json`, `pnpm-lock.yaml`          | `posthog-js@1.438.21` (exact)                                                                                                   |
| `pnpm-workspace.yaml`                              | `allowBuilds: core-js: false` (pnpm refuses installs until the new transitive build script is decided; it only prints a banner) |
| `apps/web/astro.config.ts`, `playwright.config.ts` | shared surfaces, see the Change Requests                                                                                        |

## Acceptance criteria

| #    | Criterion (short)                                     | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---- | ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | Visual parity at 1440 and 390                         | ✅     | `screenshots/banner-1440.png`, `banner-390.png`. Same geometry, tokens and copy as the design. Added: the "Privacy policy" link (required by the spec).                                                                                                                                                                                                                                                                        |
| AC-2 | Persistence, invalid values, reopen, every transition | ✅     | `consent.test.ts` (invalid values, blocked storage, cross-tab), `driver.test.ts` (unknown to all, unknown to essential, all to essential, essential to all, all to unknown), e2e "Cookie settings reopens…" and "can switch back to Accept".                                                                                                                                                                                   |
| AC-3 | Network and storage per choice                        | ✅     | e2e `consent.spec.ts`: before a choice zero Google/PostHog requests and no storage; essential: zero Google, PostHog requests carry `$cookieless_mode`, no `ph_*`/`_ga*` keys or cookies; accept: gtag.js requested, PostHog opted in.                                                                                                                                                                                          |
| AC-4 | Critical JS budget unaffected                         | ✅     | Analytics is only in lazy chunks (sizes below). The banner script itself is 1.9 KB gzip.                                                                                                                                                                                                                                                                                                                                       |
| AC-5 | No CSP violations with both providers                 | ✅     | The `page` fixture fails on any CSP violation or console error; all consent tests pass with both providers active (stubbed).                                                                                                                                                                                                                                                                                                   |
| AC-6 | axe clean, keyboard, reduced motion                   | ✅     | e2e "the banner is accessible" (EN and PL). Focus and keyboard behaviour: e2e reopen test (focus lands on the banner, returns to the footer button). The banner has no animation of its own; the buttons use the shared Button press rules, which already gate movement behind `prefers-reduced-motion: no-preference`. Forced colours: `Button` handles borders; the banner keeps its own border, so no extra rule is needed. |

## Validation output

```
$ pnpm verify          (exit 0)
packages/contracts test: Tests 153 passed (153)
apps/server test:        Tests 343 passed (343)
apps/web test:           Tests 326 passed (326)      # 27 files; format:check, lint, typecheck, build all green
$ E2E_API_PORT=3110 E2E_SITE_PORT=8807 pnpm test:e2e
69 passed, 23 skipped across chromium-desktop, chromium-mobile and webkit-desktop
  (consent.spec.ts: 10 tests x 3 projects, all passed)
```

One earlier full run had `guestbook.smoke` (T-029) time out waiting for the approved quote on chromium-desktop. It passed alone, with the consent spec, on a clean `main` worktree, and in the later full run, so I treat it as load-related flakiness in T-029, not caused by this task. Reported for the reviewer.

## Lazy chunk sizes (for T-043), built with test IDs

| Chunk                          | raw      | gzip     |
| ------------------------------ | -------- | -------- |
| `module.*.js` (posthog-js SDK) | 309.6 KB | 103.3 KB |
| `posthog.*.js` (adapter)       | 0.8 KB   | 0.5 KB   |
| `ga4.*.js` (adapter)           | 0.7 KB   | 0.4 KB   |
| `driver.*.js`                  | 0.2 KB   | 0.2 KB   |

The SDK loads only after a decision exists; gtag.js itself is Google's and loads only after "Accept". First-party code on every page: `CookieBanner` script 4.4 KB raw / 1.9 KB gzip (banner element, consent store, analytics loader).

## Tests added

- `consent.test.ts`: key and values, invalid or unreadable storage, blocked writes, notify/unsubscribe, cross-tab refresh.
- `driver.test.ts`: every consent transition against fake ports, repeats ignored, missing providers.
- `ga4.test.ts`: nothing touched before load; `js` then `config` in bundled code with `anonymize_ip`; `arguments` objects (what gtag.js reads); single script injection; withdraw and re-accept; cookie expiry names and domains.
- `posthog.test.ts`: nothing loaded before a decision; init options pinned; decision applied from `loaded`; flips during loading apply only the latest without a second load; no opt-out write for a first-time "Only essential"; failed load retries.
- `e2e/consent.spec.ts`: the AC-3 matrix, reload persistence, reopen and focus, withdrawal clears `_ga`, menu-open hides the banner, invalid stored value, axe in EN and PL.

## Screenshots

`tasks/reports/T-032/screenshots/banner-1440.png`, `banner-390.png` (I did not capture 768 or 1024; the banner has only the 760 px switch). I first saw a missing space before "Privacy policy" in them; fixed before the final run.

## Assumptions

- Copy keeps the design's text verbatim and appends a "Privacy policy" link (spec requires the link). Note for the owner: "Nothing is sold or shared" is the designed wording while "Accept" enables Google Analytics (US transfer); consider rewording together with T-033.
- Reopening from the footer moves focus to the banner region (`tabindex="-1"`, no ring); the automatic appearance never moves focus. After a choice, focus that was inside the banner goes to the footer "Cookie settings" button.
- `common.cookieNotice` (T-023) is now unused; I did not touch `common.ts`.
- GA4 withdrawal uses Google's `ga-disable-<ID>` switch plus cookie expiry instead of a reload: it stops hits immediately and "Accept" re-enables without a reload.
- Consent changes in another tab apply here via the `storage` event.

## Deviations from spec or design

1. **PostHog "Only essential" does not call `opt_out_capturing()` for a first-time visitor.** The spec says `optOut()` calls it, but in the installed version that call writes `__ph_opt_in_out_<key>=0` to localStorage, which contradicts AC-3 ("no `ph_*` keys"). Instead the SDK is initialised with `opt_out_capturing_by_default: true`, which makes an undecided SDK count as rejected (cookieless hashed counting, verified: no storage, `$cookieless_mode` in the payload). `opt_out_capturing()` is still called when consent was previously granted (withdrawal, or a persisted opt-in on reload).
2. **`advanced_disable_flags: true` is set.** Without it PostHog also fetches `eu-assets.i.posthog.com/array/<key>/config` and POSTs `/flags`, which would need a second CSP host. With it, only `eu.i.posthog.com` is contacted, so the CSP needs no `eu-assets` host (the spec's "add it only if still needed" case: not needed).
3. Added `apps/web/src/scripts/consent-store.ts` (not listed in Allowed files) so the banner and the loader share one store instance without importing each other.
4. `pnpm-workspace.yaml` edited (one line, see Files changed).

## Change Requests (shared surfaces / dependencies)

Both are applied on this branch in a separate commit (`chore(web): analytics CSP origins and e2e consent spec`) so they can be reviewed or dropped independently; the merge with T-030 is already resolved.

- **CR-1 `apps/web/astro.config.ts` (CSP, T-021 surface).** Origins are added only when the matching ID is configured:
  - `const ga4 = Boolean(env.PUBLIC_GA4_ID)`, `posthogOrigin` from `PUBLIC_POSTHOG_HOST` (default `https://eu.i.posthog.com`) when `PUBLIC_POSTHOG_KEY` is set.
  - `img-src`: `+ https://www.googletagmanager.com https://*.google-analytics.com` (GA4 only).
  - `connect-src`: `+ https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com` (GA4) and the PostHog origin.
  - `script-src` (via `scriptDirective.resources`): `+ https://www.googletagmanager.com` (GA4 only), next to T-030's Turnstile entry. Note: providing `resources` removes Astro's implicit `'self'`, so `'self'` is listed explicitly.
  - Not needed: `eu-assets.i.posthog.com`, `*.google.com`, and anything in `security-headers.ts` (it carries only non-fetch directives).
  - Resulting built policy checked with test IDs: `connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://eu.i.posthog.com`.
- **CR-2 `playwright.config.ts` (T-040 surface).** The site build env gains `PUBLIC_GA4_ID: 'G-E2ETEST000'`, `PUBLIC_POSTHOG_KEY: 'phc_e2e_test_key'`, `PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com'`, so the e2e build contains the analytics chunks and CSP origins. The fixtures already stub those hosts.
- **Production env:** the Cloudflare build needs `PUBLIC_GA4_ID`, `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST` (CI), see `.env.example`.

## Open issues and follow-ups

- **Owner actions:** create the GA4 property (measurement ID); create a PostHog EU project and enable _Cookieless server hash mode_ (required for the "Only essential" counting to be attributed); set the three `PUBLIC_*` variables in the Cloudflare build; review the PL copy (drafts: all strings in `messages/cookies.ts`, e.g. "Akceptuję", "Tylko niezbędne"); legal view on cookieless counting under ePrivacy (ADR-0011 flag) and on the "Nothing is sold or shared" wording.
- The real PostHog and Google endpoints were never contacted (all stubbed), so the real request shapes were verified only against the SDK in a stubbed browser. A smoke check against a real project after the owner sets it up is advisable.
- PostHog ignores automated browsers; the e2e spec presents a regular browser (`navigator.webdriver`, `userAgentData`) via an init script, documented in the spec.
- The e2e consent test for "no banner after reload" uses a fixed 1.2 s wait (there is no event for an absence; the banner timer is 900 ms).
- No no-JS fallback: without JS there is no analytics, so no banner is needed.
