# T-035 review, round 1

- **Reviewer:** orchestrator (Opus); size S, reviewed directly
- **Verdict:** APPROVED

- Viewed `apps/web/public/og/og-en.png` and `og-pl.png` (1200×630, 94 KB / 100 KB): on-brand (sketch headline, mascot, drips, logo, grid), legible at thumbnail size, PL glyphs (Ł) render with the latin-ext subset.
- `Seo.astro`: absolute `og:image` from `site`, width/height, localized `og:image:alt`, `twitter:card=summary_large_image`; minimal change.
- The `/__og/[locale]` source route is injected only under `astro dev` (same mechanism as the showcase); not present in `dist`.
- Generator `tools/og/render-og.ts` (`pnpm og:generate`): one browser, reduced motion, deterministic output, fails on missing font or files > 300 KB; kills only its own server.

NIT (follow-up): `tools/` isn't covered by the root `typecheck` (same as `tools/design`); fold into T-043 if cheap. PL OG subtitle/alt are drafts for T-034. Gate C: `pnpm verify` on the squash-merged tree.
