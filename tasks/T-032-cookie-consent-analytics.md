# T-032: Cookie consent banner, GA4 (consent-only), and PostHog (cookieless on reject)

|                          |                                                                               |
| ------------------------ | ----------------------------------------------------------------------------- |
| **Wave**                 | 5                                                                             |
| **Depends on**           | T-021, T-022, T-023 (footer `[data-cookie-settings]`, `html[data-menu-open]`) |
| **Blocked by decisions** | none (D-03 answered)                                                          |
| **Parallel with**        | T-029, T-030, T-033, T-017, T-035                                             |
| **Size**                 | L                                                                             |
| **Requirements**         | FR-16, NFR-03, NFR-06, security T17                                           |

## Objective

Implement the designed cookie banner with persistent and changeable consent, and wire two analytics providers:

- **GA4**: loaded only after "Accept".
- **PostHog EU** with `cookieless_mode: 'on_reject'`: nothing before a choice, full tracking on "Accept", cookieless hashed counting on "Only essential".

Analytics must never slow the critical path or leak data before consent.

## References

- `docs/decisions/0011-consent-gated-analytics.md` (the consent → provider table is normative)
- `docs/design-analysis.md` §4.14
- `docs/security.md` §5 (CSP origins), §8 (privacy table), T17
- `docs/research.md` §8 (PostHog cookieless, GA4 CSP)
- `docs/design/extracted/design-source.html` L324–341, L489, L539–540, L626–627
- Screenshot: `desktop-1440-hero-with-cookie-banner.png`

## Scope

- `lib/consent.ts` (pure):
  - `ConsentState = 'unknown' | 'all' | 'essential'`
  - `readConsent(storage)` validates the stored value
  - `writeConsent`
  - subscribe and notify
  - storage key `jl-cookies`
- `site/CookieBanner.astro` + `scripts/cookie-consent.ts` (`<cookie-banner>`):
  - visuals per §4.14
  - `role="region"` with a localized label; text links to the privacy page
  - "Accept" and "Only essential"
  - shown 900 ms after load when `unknown`; hidden while `html[data-menu-open]`; no focus stealing
  - after a choice, it hides and focus moves sensibly
  - `[data-cookie-settings]` re-opens it
- `lib/analytics/ga4.ts` adapter:
  - `load(id)`: create `window.dataLayer` and a `gtag` function in bundled code, set `gtag('js', new Date())` and `gtag('config', id, { anonymize_ip: true })`, then inject `<script async src="https://www.googletagmanager.com/gtag/js?id=…">` (an external script; CSP allowlisted; no inline script)
  - `unload()`: delete `_ga`, `_ga_*`, `_gid` cookies for the apex domain and stop further sends (reload is acceptable after withdrawal; document the choice)
- `lib/analytics/posthog.ts` adapter:
  - dynamic `import('posthog-js')` (a lazy chunk), then `posthog.init(key, { api_host: PUBLIC_POSTHOG_HOST, cookieless_mode: 'on_reject', autocapture configured so input values are never captured, disable_session_recording: true, disable_surveys: true, disable_external_dependency_loading: true (verify option names in the installed version) })`
  - `optIn()` → `opt_in_capturing()`; `optOut()` → `opt_out_capturing()`
  - **Initialize only when consent is already decided** (`all` or `essential`), and apply the opt call in the `loaded` callback. This avoids the known refusal-during-load race.
- `scripts/analytics.ts`:
  - runs on `requestIdleCallback` (falls back to `setTimeout`)
  - subscribes to consent and drives both adapters per the ADR table
  - no-op for a provider whose `PUBLIC_*` ID is empty (the chunk isn't even imported)
- CSP: add the GA4 and PostHog origins to `astro.config.ts` `security.csp` (`security.md` §5) via a **Change Request** to the T-021 shared surface, or directly if the orchestrator pre-approves. Verify in the browser that no further origins are needed. If PostHog still fetches from `eu-assets.i.posthog.com`, add only that host and record why.
- `messages/cookies.ts`.

## Allowed files

`apps/web/src/lib/consent.ts`, `apps/web/src/lib/analytics/**` (+ tests), `apps/web/src/components/site/CookieBanner.astro`, `apps/web/src/scripts/{cookie-consent,analytics}.ts`, `apps/web/src/i18n/messages/cookies.ts`, `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/astro.config.ts` (CSP directives only, via CR), `e2e/consent.spec.ts` (if T-040 has merged).

## Dependencies (exact)

web: `posthog-js@1.438.21`.

## Acceptance criteria

- **AC-1** Visual parity with the design banner at 1440 and 390.
- **AC-2** Consent persists; invalid stored values → `unknown`; "Cookie settings" re-opens the banner; changing the choice reconfigures providers (unit tests with fake adapters for every transition: unknown→all, unknown→essential, all→essential, essential→all).
- **AC-3** Network (e2e with intercepted hosts):
  - before a choice: **zero** requests to Google or PostHog
  - "Only essential": zero Google requests, PostHog requests only in cookieless mode, and no `ph_*` or `_ga*` cookies or localStorage keys
  - "Accept": gtag.js loads and PostHog is opted in
- **AC-4** The first-party critical JS budget is unaffected: the analytics code lives in lazy chunks. Report their gzip sizes for T-043.
- **AC-5** No CSP violations with both providers active (stub responses).
- **AC-6** axe clean; keyboard reachable; reduced motion respected.

## Validation

```
pnpm verify
pnpm preview   # with PUBLIC_GA4_ID / PUBLIC_POSTHOG_KEY set to test values
```

## Definition of done

Standard DoD. The report lists the owner actions (GA4 property, PostHog EU project + _Cookieless server hash mode_).
