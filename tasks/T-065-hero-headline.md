# T-065: New hero headline

- **Wave:** 7 (copy) · **Size:** S · **Depends on:** T-024, T-035, T-060 (done)
- **Owner decision (2026-10-27):** the hero `h1` changes from "I'm a Software Engineer!" / "Jestem Software Engineerem!" to:
  - **PL:** `Inżynieria z myślą o relacji z użytkownikiem`
  - **EN:** `Engineering with the user relationship in mind` (orchestrator's translation of the owner's PL line; flag it for owner review in the report)

  The language follows the page locale, as all copy does.

## Scope

1. `apps/web/src/i18n/messages/hero.ts`: `title` in `en` and `pl`. Use the exact strings above: no trailing punctuation, sentence case, typographic characters only where the language needs them.
2. **The headline is quoted elsewhere; keep it consistent:**
   - `apps/web/src/i18n/messages/seo.ts`: `og.alt` in EN and PL quotes the old headline ("…a hand-drawn mascot under the headline “I'm a Software Engineer!”"). Update the quote in both locales. Leave the SEO `title`, `description`, `og.subtitle` and `profile.role` as they are: the owner changed only the hero headline.
   - `docs/content/pl-copy-review.md`: the hero `title` row and the `og.alt` row.
3. **OG share images:** `apps/web/src/dev/og.astro` renders `hero(locale).title`, and `pnpm og:generate` (`tools/og/render-og.ts`) screenshots it into `apps/web/public/og/og-{en,pl}.png`. Regenerate both images and check visually that the longer headline fits the 1200 × 630 card without clipping or overflow. If it doesn't fit, adjust only the headline sizing or wrapping in `dev/og.astro` with existing tokens (e.g. `text-wrap: balance`, a smaller existing `--text-*` token), and report what you changed.
4. **Hero layout check:** the new line is about twice as long. Check the hero at 390, 768, 1024 and 1440 px in both locales:
   - The `h1` wraps nicely (`text-wrap: balance` is likely already there).
   - Nothing overflows horizontally, and long Polish words like "użytkownikiem" don't overflow at 390 px.
   - The mascot and buttons keep their design positions.
   - The T-060 ink entrance (`hero-ink` clip-path, negative insets) still reveals the whole multi-line headline, including descenders and doodle-font glyphs.

   Change hero CSS only if something actually breaks, using existing tokens and the component-scoped style, and say why in the report.

5. **Tests:** update unit tests or e2e specs that assert the old headline text (search `apps/web` for "Software Engineer!" and "Software Engineerem"). Don't add new tests.

## Constraints

- No other copy changes. No new tokens. CSP rules as usual. Reduced motion and forced colours unaffected.
- Component styles stay component-scoped (ADR-0008); motion keyframes stay in `styles/motion/hero.css`.

## Allowed files

`apps/web/src/i18n/messages/hero.ts`, `apps/web/src/i18n/messages/seo.ts` (`og.alt` only), `apps/web/src/dev/og.astro` (headline sizing only, if needed), `apps/web/public/og/og-en.png`, `apps/web/public/og/og-pl.png`, `apps/web/src/components/sections/Hero.astro` (headline CSS only, if needed), tests or specs asserting the old text, `docs/content/pl-copy-review.md` (the two rows), `tasks/T-065-hero-headline.md` (commit this spec), `tasks/reports/T-065/**`.

## Acceptance criteria

1. `/` (EN) shows "Engineering with the user relationship in mind"; `/pl/` shows "Inżynieria z myślą o relacji z użytkownikiem".
2. No overflow or clipping at 390, 768, 1024 or 1440 px in either locale; the entrance animation reveals the full headline.
3. The OG images show the new headline, fully visible; `og.alt` matches.
4. `pnpm verify` green.

## Validation

- `pnpm verify`; `pnpm og:generate` (read `tools/og/render-og.ts` first and check which port it uses; never use 3000/4321, which the owner's `pnpm dev` holds, and if it hard-codes one of those, report it instead of killing anything).
- Throwaway Playwright screenshots against `pnpm --filter @portfolio/web build` + `pnpm --filter @portfolio/web exec astro preview --port 4405` (**port 4405 only**; kill only PIDs you started):
  - the hero at the four widths × two locales;
  - the settled state;
  - one mid-animation frame at 1440 px;
  - `scrollWidth <= clientWidth` on `<html>`.
- Keep a small, representative set of screenshots in `tasks/reports/T-065/screenshots/` (max ~6 PNGs) and list them in the report.
- Don't run `pnpm test:e2e`.
