# Lighthouse, SEO and accessibility audit, 2026-10-27 (T-043)

Tool: Lighthouse **13.5.0** (`npx -y lighthouse@13.5.0`, no repo dependency), Chrome 156 (system Chrome), headless, default simulated throttling (mobile: 4x CPU, 1.6 Mbps, 150 ms RTT). Target: the built site via `pnpm preview` (Node edge emulator on :8787).

## Test topology note

The Node edge emulator serves HTTP/1.1 with no compression, which Cloudflare never does in production. Two sets of runs are recorded:

1. **Raw emulator** (`http://localhost:8787`, HTTP/1.1, uncompressed): measured before the fixes below.
2. **Edge-like** (a throwaway local proxy in front of the emulator adding HTTP/2 over TLS and brotli; not committed): the realistic numbers, final build.

## Scores

| Run                       | Performance | Accessibility | Best Practices | SEO | FCP   | LCP   | TBT    | CLS   |
| ------------------------- | ----------- | ------------- | -------------- | --- | ----- | ----- | ------ | ----- |
| `/` mobile (edge-like)    | **88**      | 100           | 100            | 100 | 2.3 s | 3.3 s | 100 ms | 0.077 |
| `/` desktop (edge-like)   | 100         | 100           | 100            | 100 | 0.5 s | 0.6 s | 0 ms   | 0.001 |
| `/pl` mobile (edge-like)  | **88**      | 100           | 100            | 100 | 2.3 s | 3.3 s | 90 ms  | 0.077 |
| `/pl` desktop (edge-like) | 100         | 100           | 100            | 100 | 0.5 s | 0.6 s | 0 ms   | 0.001 |
| `/` mobile (raw emulator) | 71          | 100           | 96             | 100 | 3.8 s | 5.3 s | 0 ms   | 0     |
| `/` desktop (raw)         | 98          | 100           | 96             | 100 |       |       |        |       |
| `/pl` mobile (raw)        | 73          | 100           | 96             | 100 | 3.7 s | 5.0 s | 0 ms   | 0     |
| `/pl` desktop (raw)       | 98          | 100           | 96             | 100 |       |       |        |       |

Best Practices 96 on the raw runs was the missing `/favicon.ico` (404 console error); fixed (see below).

## AC-2 status: mobile Performance misses 95 (88)

Accessibility, Best Practices and SEO are 100 everywhere; desktop Performance is 100. Mobile Performance is 88 on both locales.

Findings:

- The unthrottled, observed FCP/LCP in the same run is about 290 ms; the gap is the simulated 1.6 Mbps link.
- Under simulation FCP/LCP track font bytes: the display font "Rubik Doodle Shadow" ships a 210 KB latin file (preloaded, per T-024) plus a 120 KB latin-ext file (needed for Polish and for the "Ł" in the hero), on top of about 100 KB of Poppins, Ubuntu and JetBrains Mono. Fonts are about 330 KB against about 40 KB of HTML, CSS and JS combined (gzip).
- Tried and rejected (all measured): dropping the display-font preload (88 to 84), `font-display: optional` on the display font (88 to 84), `optional` on all fonts (about 79 on the raw emulator), `content-visibility: auto` on below-the-fold sections (88 to 89, reverted as not worth the risk).
- Reaching 95 needs a design-level change (subsetting or replacing the display font, or fewer Poppins weights), which is outside T-043's "small fixes" and belongs to the design owner (T-042 / owner decision). Recommended: subset Rubik Doodle Shadow to the glyphs actually used (hero and section headings), which would remove roughly 300 KB.
- Smaller items, not fixed: CLS 0.077 comes from the marquee shifting when web fonts swap in; the paint-drips parallax script does one `getBoundingClientRect` at load (14 ms forced reflow).

## Fixes made in this task

1. `apps/web/src/components/seo/Seo.astro`: 404 pages no longer emit `canonical`, `hreflang` alternates, `x-default` or `og:url` (they pointed at `/404`); they keep `noindex`.
2. `apps/web/public/favicon.svg` plus `<link rel="icon">` in `apps/web/src/layouts/BaseLayout.astro`: removes the `/favicon.ico` 404 and lifts Best Practices from 96 to 100. The icon is a plain "J" monogram in the token ink and background colours; the owner may replace it.

## SEO checks (built `dist`)

| Check                | Result                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Unique titles        | 6 pages, 6 distinct titles                                                                             |
| Unique descriptions  | 6 pages, 6 distinct descriptions                                                                       |
| Canonical            | present and self-referencing on `/`, `/pl`, `/privacy`, `/pl/privacy`; absent on both 404s (by design) |
| hreflang reciprocity | en, pl and x-default identical on each translated pair; EN and PL pages reference each other           |
| JSON-LD              | parses as `Person` on every page; no email or phone                                                    |
| 404 `noindex`        | `/404` and `/pl/404` have `<meta name="robots" content="noindex">`, no canonical or hreflang           |
| Sitemap              | 4 URLs with `en-US` and `pl-PL` alternates; 404s excluded                                              |
| robots.txt           | `Disallow: /set-language`; `Sitemap: https://jakublobos.com/sitemap-index.xml`                         |
| One `<h1>` per page  | yes (6/6)                                                                                              |

Note: the local build's canonical and sitemap URLs use `http://localhost:4321` because `PUBLIC_SITE_URL` is unset; `pnpm check:release --release` reports this until a production build is made.

## Keyboard walkthrough (Playwright, both locales)

Scripted Tab-through of the home page at 1280 px, EN and PL (34 tab stops each, then focus leaves the document):

- Order: skip link, logo, five section links, language switcher, GitHub, LinkedIn, email, hero CTAs, marquee pause button, three timeline buttons, guestbook input and submit, footer and contact links, show-number button, contact form fields and submit, privacy, cookie settings, back to top.
- Every focused element has a visible outline or ring and a non-zero box (0 failures in both locales).
- The skip link is first and works with Enter (URL becomes `#top`); `main#top` is not focusable, so the next Tab continues from the start of main.
- Mobile (390 px): the menu button opens the menu with focus moved to "Close"/"Zamknij"; Escape closes it and returns focus to "Open menu"/"Otwórz menu".

## Screen-reader proxy (accessibility tree)

NVDA and VoiceOver are not available in this environment. As a proxy, `locator('body').ariaSnapshot()` was reviewed in EN and PL: landmarks (banner, `navigation "Main"`/`"Główna"`, `complementary "Social links"`, `main`, `contentinfo`), one `h1`, `h2` per section and `h3` per entry, labelled regions, a labelled contact form with labelled textboxes, and decorative elements (logo braces, drips) absent from the tree. No blocking issues found. Copy observations for the owner (not changed; copy is owned elsewhere): the hero paragraph reads "I'm making web-apps mostly in react & typescript Designing web-apps in figma" with no sentence break; "Get my resume" links to a PDF that does not exist yet (D-10).

**A real NVDA (Windows) and VoiceOver (macOS/iOS) spot check of the home page in both locales is left for the owner.**
