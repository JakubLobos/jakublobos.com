# ADR-0002: Astro static output, no UI framework

- **Status:** Accepted · **Date:** 2026-10-25 · **Related:** NFR-03, NFR-13, FR-20…FR-29

## Context

The site is a single content page in two locales, plus a privacy page. The interactivity is DOM-level: pointer tracking, scroll-driven timeline, marquee, menu dialog, two forms, a cookie banner, and a custom scrollbar. None of it needs component re-rendering or shared client state. The prototype used React only because Claude Design does. Astro 7.4.2 is current (npm, 2026-10-25).

## Decision

- `output: 'static'`. All pages are prerendered (`build.format: 'file'`, `trailingSlash: 'never'`) and served by Express (ADR-0003).
- No React/Preact/Svelte/Vue. Interactivity uses Astro-processed `<script>` modules that define **custom elements**, one per interactive component. Testable logic lives in DOM-free `lib/` modules.
- Dynamic data (latest guestbook message) is fetched client-side. The static HTML ships the empty-state text with reserved space.

## Alternatives considered

| Option                                                                                 | Why not                                                                                                  |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| React islands (`client:visible`) mirroring the prototype                               | Adds ~45 KB+ gz runtime for behaviours that are a few dozen lines of DOM code; worse performance budget  |
| Preact islands                                                                         | Smaller, but the same conceptual cost; the forms aren't complex enough to justify it                     |
| Astro on-demand rendering (`@astrojs/node`) for the latest message or locale detection | Adds an adapter and SSR runtime for one dynamic string and one redirect that Express handles more simply |
| Alpine.js                                                                              | Extra dependency and inline-attribute expressions that conflict with a strict CSP                        |

## Consequences

- Minimal JS. No hydration cost. CSP is simple (hashed Astro scripts only).
- Agents must write disciplined vanilla TS: the custom-element pattern, `AbortController` teardown, rAF throttling (see `architecture.md` §4.3).
- If a future feature needs rich client state (for example a message list with pagination), revisit with Preact islands for that feature only.

## Sources

- Astro i18n: `preferredLocale` is only available on on-demand pages: https://docs.astro.build/en/guides/internationalization/ (accessed 2026-10-25)
- Astro releases (7.4.2): https://astro.build/blog/astro-7/ , npm registry
