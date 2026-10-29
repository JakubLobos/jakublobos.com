# T-095: Animated share image

- **Wave:** 8 (go-live) · **Size:** S · **Depends on:** T-035
- **Owner request (2026-10-29):** use the owner-supplied `og-animation-v2.gif` (1200×630, 96 frames, 5.76 s loop, 480 KB) as the link preview. Its first frame is a complete card for apps that don't animate GIFs.
- **Owner decision:** one image for both locales (its text is English). That makes the T-035 PNG generator dead code, so it goes.
- **Platform support (research, 2026-10-29):** X uses only the first frame of a GIF (X cards docs). Discord animates GIF previews. Messenger, Facebook, WhatsApp and LinkedIn are expected to show the first frame. Slack and Telegram are unverified. WhatsApp documents a 600 KB image cap, the strictest one, so that is the release-check budget.
- **Changes:**
  - `apps/web/public/og/og-animation-v2.gif` replaces `og-en.png` and `og-pl.png`. The version stays in the file name because apps cache previews by image URL.
  - `Seo.astro`: `og:image` points at the GIF for both locales, plus `og:image:type=image/gif`. `twitter:card` stays `summary_large_image`.
  - `seo.ts`: `og` keeps only the localized `alt`, which now describes the GIF. The PL draft needs owner review.
  - Removed: `tools/og/render-og.ts`, `apps/web/src/dev/og.astro`, the `/__og/[locale]` dev route, the root `og:generate` script, and `og.subtitle` / `og.domain`.
  - `tools/check-release-assets.mjs` checks for a 1200×630 GIF of at most 600 KB, replacing the two PNGs of at most 100 KB.
  - `tools/i18n/export-copy.ts`: the now-unused `jakublobos.com` whitelist entry is dropped.
  - The e2e head test, `docs/architecture.md`, `docs/testing.md` and the regenerated `docs/content/pl-copy-review.md` follow.
- **Allowed files:** the files above and `tasks/T-095-animated-og-image.md`.
- **Validation:** `pnpm verify`, then `pnpm check:release` on the build. Run `pnpm test:e2e e2e/i18n.spec.ts`. After deploy, share a link on Messenger, X, Discord and WhatsApp and check that the preview appears.
