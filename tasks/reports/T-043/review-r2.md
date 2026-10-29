# T-043 review, round 2 (orchestrator)

**Verdict: APPROVED.** The round-1 review (orchestrator, in conversation) raised: mobile Performance 88 < 95, the lazy cap never exercised, `.mjs` typecheck, and the favicon owner flag. All of them are resolved or accepted below.

## Acceptance criteria

- AC-1: `check:budgets` runs at the end of `pnpm verify`; eager is 13.6 KB JS / 11.4 KB CSS gzip; a stub-analytics build finds 4 lazy chunks at 50.6 KB of the 80 KB cap, and a lowered cap fails as expected. ✅
- AC-2: Lighthouse 13.5.0 mobile is 95/100/100/100 on `/` and `/pl`; desktop is 100 across the board. Measured behind a local HTTP/2 + brotli proxy, because the preview emulator serves HTTP/1.1 uncompressed; Cloudflare serves both in production. ✅
- AC-3: `check:release` reports only the two resume PDFs (D-10). ✅
- AC-4: keyboard walkthrough plus accessibility-tree review in both locales, no blockers; a real NVDA/VoiceOver pass is left to the owner. ✅ (owner spot check pending)

## Findings

- R2-01 ACCEPTED: the display font is subset into two `unicode-range` faces (latin 150 KB, Polish-only latin-ext 23 KB), and the preloaded-font cap is raised from 1 to 2. Characters in display text were verified against the subset on all six built pages; only static i18n text uses `--font-display`.
- R2-02 NOTE `tools/fonts/subset-display.mjs`: fetches pinned `@fontsource/rubik-doodle-shadow@5.2.5` from jsDelivr. It's a manual generator, never run in verify or CI. If the display copy gains a character outside the set, re-run it with the set extended.
- R2-03 ACCEPTED: `tools/*.mjs` stay out of `checkJs` (43 errors: untyped JS, browser globals in `capture-design.mjs`, no types for `subset-font`); `tools/og/render-og.ts` is now type-checked.
- R2-04 OWNER: `public/favicon.svg` (ink-on-paper "J" monogram) is a provisional design addition; keep or replace.
- R2-05 BACKLOG: mobile CLS 0.077, from the marquee shifting on font swap (under 0.1, no score impact); T-042 may tighten it.
