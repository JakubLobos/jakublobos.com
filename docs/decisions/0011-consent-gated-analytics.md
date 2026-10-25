# ADR-0011: Consent banner with GA4 (consent-only) and PostHog (cookieless on reject)

- **Status:** Accepted (owner decisions D-03, D-22, 2026-10-25) · **Related:** FR-16, NFR-03, NFR-06, T16

## Context

The design's banner offers "Accept" and "Only essential". The owner wants GA4 plus PostHog with cookieless mode. Verified facts (2026-10-25):

- **PostHog** `cookieless_mode` has two values:
  - `"always"`: no banner needed.
  - `"on_reject"`: PostHog stores nothing in cookies or local/session storage until opt-in, and captures nothing until consent is given or denied. If consent is denied, PostHog still counts users with a privacy-preserving server-side hash. Wire it with `posthog.opt_in_capturing()` / `posthog.opt_out_capturing()`.
  - It requires the project setting _Cookieless server hash mode_ to be enabled.
  - Known race: if a refusal happens while the PostHog script is still loading, PostHog may start anyway (c15t issue #1494). We avoid this by applying consent only after initialization completes and never initializing before a stored or explicit decision.
  - CSP: PostHog recommends `https://*.posthog.com` for `script-src` and `connect-src`. EU hosts are `eu.i.posthog.com` (ingestion) and `eu-assets.i.posthog.com` (assets).
- **GA4 CSP** (Google tag CSP guide, without Ads features): `script-src https://www.googletagmanager.com`; `img-src https://www.googletagmanager.com https://*.google-analytics.com`; `connect-src https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com`.

## Decision

- `lib/consent.ts`: a pure state machine (`unknown | all | essential`), persisted in `localStorage['jl-cookies']` (the prototype's key and values).
- `scripts/analytics.ts`: loaded after `requestIdleCallback`. It reacts to consent:

  | Consent                        | GA4                                                                                  | PostHog (EU, `cookieless_mode: 'on_reject'`)              |
  | ------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------- |
  | `unknown` (banner showing)     | not loaded                                                                           | not initialized: nothing stored, nothing sent             |
  | `all` ("Accept")               | inject `gtag.js` (`PUBLIC_GA4_ID`) with init done in bundled code (no inline script) | init → `opt_in_capturing()` (full tracking)               |
  | `essential` ("Only essential") | not loaded; if it was loaded earlier, delete `_ga*` cookies                          | init → `opt_out_capturing()` (cookieless hashed counting) |

- PostHog is bundled from npm (`posthog-js`, dynamic import → a separate lazy chunk) with session recording, surveys, and remote extension loading disabled. CSP only needs `connect-src https://eu.i.posthog.com` plus the asset host if PostHog still fetches config. T-032 verifies the exact origins in the browser and keeps the allowlist minimal.
- Analytics chunks are excluded from the critical JS budget (they load on idle) but have their own budget check (T-043).
- Both providers are compiled out when their `PUBLIC_*` IDs are unset (development and tests).

## Consequences

- Owner actions: create a GA4 property and a PostHog EU project, and enable _Cookieless server hash mode_.
- Privacy policy (T-033) lists Google (US transfer; consent) and PostHog (EU; consent for full tracking, legitimate interest for cookieless counting). Whether cookieless counting needs consent under ePrivacy is a legal judgement; PostHog positions it as storage-free. **Flag for the owner's legal review.**
- Running two analytics tools adds weight; the lazy loading and budget check keep it off the critical path.

## Sources (accessed 2026-10-25)

- https://posthog.com/tutorials/cookieless-tracking (via search summary), https://posthog.com/docs/libraries/js/persistence , https://posthog.com/docs/advanced/content-security-policy
- https://github.com/c15t/c15t/issues/1494 (consent race)
- https://developers.google.com/tag-platform/security/guides/csp
