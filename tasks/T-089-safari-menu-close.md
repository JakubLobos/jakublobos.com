# T-089: Safari mobile menu close flash

- **Wave:** 8 (go-live) · **Size:** S · **Depends on:** T-084
- **Owner bug report (2026-10-29):** on mobile Safari (production), closing the menu makes the items disappear later than their container and render broken for a moment.
- **Root cause (orchestrator's analysis, applied):** the exit transitioned `display` and `overlay` discretely. Safari supports `allow-discrete` for `display` but not `overlay`, so the dialog stayed rendered while it left the top layer and stopped matching `:modal` (its flex layout is scoped to `:modal`). The retracting sheet was drawn out of the top layer with a broken layout.
- **Fix:** the exit transition (`clip-path`, `display`, `overlay`) applies only inside `@supports (overlay: auto)` (Chromium). Engines without `overlay` close instantly. The entrance transition moved to `dialog:modal` and needs only `clip-path`, so it works everywhere.
- **Allowed files:** `apps/web/src/components/site/MobileMenu.astro`, `tasks/T-089-safari-menu-close.md`.
- **Validation:** `pnpm verify`; throwaway Playwright probe (WebKit and Chromium, 390x844, touch) on the built site: entrance animates in both, Chromium exit still retracts, no rendered-but-non-modal frames in WebKit, focus returns to the Menu button for Close, Escape and link closes.
