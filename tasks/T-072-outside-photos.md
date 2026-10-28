# T-072: Real photos and calmer heading for "Outside of work"

- **Wave:** 7 (content) · **Size:** S · **Depends on:** T-071
- **Owner request (2026-10-28, D-34):** use the owner's real photos, shorten the heading, and tighten the space between heading and body.

## Scope

- **Photos.** Replace the placeholders with `madeira` (4:3), `iceland` (3:4) and `japan` (3:4), in that collage order.
  - Source: the owner's originals (WebP, not committed). Scaled once with a throwaway sharp script: long side at most 1600 px, never upscaled, EXIF auto-rotated, metadata stripped, sRGB, mozjpeg JPEG at quality 82.
  - Saved as `apps/web/src/assets/outside/{madeira,iceland,japan}.jpg`; `photo-1..3.jpg` are deleted and the ids renamed.
- **Collage.** Rebalance the slots (one wide landscape, two portraits) so nothing overflows horizontally or is clipped by the section's `clip-path` at 390, 768, 1024 and 1440 px. Tape variety stays. Japan keeps the face in frame. Each slot carries its own measured `sizes`.
- **Alt texts.** Real EN and PL alt texts replace the placeholders (PL is a draft for owner review). The `TODO(owner)` note is removed.
- **Heading.** Title becomes `I like to travel` / `Lubię podróżować`. Eyebrow and body are unchanged.
- **Spacing.** `.copy` uses `var(--space-20)` between heading and body, the same gap `Contact.astro` uses for its intro.
- **Docs.** Regenerate `docs/content/pl-copy-review.md`; add one sentence to the D-34 row in `docs/decisions/open-questions.md`.

## Allowed files

- `apps/web/src/components/sections/Outside.astro`, `apps/web/src/content/outside.ts`, `apps/web/src/i18n/messages/outside.ts`
- `apps/web/src/assets/outside/**`
- `docs/content/pl-copy-review.md`, `docs/decisions/open-questions.md`, `tasks/T-072-outside-photos.md`, `tasks/reports/T-072/**`

## Acceptance

- `pnpm verify` is green, including `check:budgets`; no `style="` in `dist/` HTML.
- At 390, 768, 1024 and 1440 px, EN and PL: no horizontal overflow, every photo sits inside the section box, axe is clean on `#outside`.
