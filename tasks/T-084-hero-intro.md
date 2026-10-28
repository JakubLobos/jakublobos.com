# T-084: Hero intro rewrite

- **Wave:** 8 (go-live) · **Size:** S · **Depends on:** T-082
- **Owner request (2026-10-28):** replace the two-line hero intro with one sentence: "Specializing in web application development and interface design using modern web technologies." PL (orchestrator's translation, owner to review): "Specjalizuję się w tworzeniu aplikacji webowych i projektowaniu interfejsów z użyciem nowoczesnych technologii webowych."
  - "web application development" stays blue (`.tech`); "interface design" gets the marker (`<Highlight>`).
  - Single-letter Polish words ("w", "i") stay glued to the following phrase.
  - Merge the two `.actions` rule blocks in `Hero.astro`.
- **Allowed files:** `apps/web/src/i18n/messages/hero.ts`, `apps/web/src/components/sections/Hero.astro`, `docs/content/pl-copy-review.md`, `tasks/T-084-hero-intro.md`, `tasks/reports/T-084/`.
- **Validation:** `pnpm verify`; hero screenshots at 390 and 1440 in EN and PL, no horizontal overflow, axe clean on `#hero`.
