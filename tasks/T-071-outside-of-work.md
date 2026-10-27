# T-071: "Outside of work" section (text + three taped photos)

- **Wave:** 7 (content) · **Size:** M · **Depends on:** T-026, T-070 (projects; may still be open as PR #22, independent files)
- **Owner decision (2026-10-28, D-34):** a new home-page section, "Outside of work":
  - left, a short personal text;
  - right, **three photos that look stuck to the page with paper tape**. It should look tasteful and fit the site's hand-made paper style.
  - The owner will send the real photos later. Build it with placeholder images that can be swapped by replacing files only.

## Placement (orchestrator decision; the owner can move it later)

- On the home page (`HomePage.astro`), between **Skills** and **Guestbook**.
- Section index `04`. Renumber Guestbook to `05` and Contact to `06` (`SectionHeading index`).
- Section `id="outside"`.
- **Not added to the navigation** (`NAV_SECTIONS`). This keeps the header at five items. Make sure the nav's current-section logic still behaves: Skills stays current while you scroll through it, and nothing breaks.

## Copy (i18n, EN + PL)

Use a new message module, `apps/web/src/i18n/messages/outside.ts`, following `projects.ts`. Eyebrows are upper-cased in the source.

- eyebrow: `OUTSIDE OF WORK` / `POZA PRACĄ`
- title: `Exploring the world` / `Odkrywam świat`
- body EN (owner's text, verbatim): `Outside of work, I love exploring new places, meeting people, and discovering different cultures. From the landscapes of Iceland to the streets of Japan, and the sunny shores of Madeira, Cyprus, and Tenerife, every destination has something unique to offer.`
- body PL (orchestrator's translation): `Poza pracą uwielbiam odkrywać nowe miejsca, poznawać ludzi i różne kultury. Od krajobrazów Islandii, przez ulice Japonii, po słoneczne wybrzeża Madery, Cypru i Teneryfy – każde miejsce ma w sobie coś wyjątkowego.` Run it through `polishTypography`, as other PL content does.
- Photo alt texts per photo, in EN and PL. Until the real photos arrive, use honest placeholder alts, e.g. `Travel photo (placeholder)` / `Zdjęcie z podróży (zastępcze)`. Mark them clearly as TODO for the owner in the report.

Flag the title and all PL copy for owner review.

## Photos

- **Source files:** `apps/web/src/assets/outside/photo-1.jpg`, `photo-2.jpg` and `photo-3.jpg`. Render them with `astro:assets` (`<Picture>` with AVIF/WebP and a JPEG fallback, correct `width`/`height`, `sizes`, `loading="lazy"`, `decoding="async"`).
  - Swapping a photo later must mean replacing the file (and its alt) only.
  - Data lives in `apps/web/src/content/outside.ts`: an ordered list of `{ id, src (imported asset), alt: Localized }`, plus an optional `caption: Localized` if you add handwritten captions. Captions are optional; skip them unless they clearly improve the look. Without real places, keep any caption placeholder neutral.
- **Placeholders:** three small neutral images, generated once and committed (e.g. muted paper-tone landscapes or plain tints at about 1200 × 900, each under ~60 KB). No text inside the image.
  - Use different aspect ratios (e.g. one portrait, two landscape) so the collage is exercised realistically.
  - Generate them with whatever is already installed (e.g. `sharp` from the workspace in a throwaway script). Don't commit the script.
- **Image pipeline:** check that Astro's sharp image service resolves from `apps/web` under pnpm. `sharp` is installed transitively (0.35.5).
  - If the build can't resolve it, you may add `sharp` to `apps/web` with `pnpm add -E sharp@0.35.5`. Say so in the report, because it is a dependency addition the owner must sign off.
  - No other dependencies.
- **CSP:** the built HTML must contain **no `style="…"` attributes**. Don't use Astro's responsive-image `layout` option if it emits inline styles. Verify with grep on `dist/`.
- **Budgets:** `pnpm check:budgets` must pass. Images are lazy and below the fold.

## Look and feel: "taped to the page"

Study `docs/design-system.md` and `docs/design/extracted/design-source.html` (paper and ink language, hard ink shadows `--shadow-thumb`/`--shadow-card`, borders, paints). Then:

- Each photo sits in a paper frame: a white or paper border via padding, and a subtle ink outline or hard shadow consistent with the site. Each has a slight rotation (e.g. about −3°, 2°, −1.5°). On desktop the photos form a loose, slightly overlapping collage in the right column.
- **Tape:** one or two translucent paper-tape strips per photo, at the top edge or corners, slightly rotated, with torn or zig-zag ends (`clip-path`) and a token paint at reduced opacity.
  - Use pseudo-elements in component CSS. No images, no new dependencies.
  - Vary the strips per photo so they don't look stamped.
- **Hover/focus** (pointer devices only, `@media (hover: hover)`): a subtle lift or straighten, using existing motion tokens. The photos aren't interactive, so there's no focus state and no tab stop.
- `prefers-reduced-motion`: no transform transitions.
- `forced-colors`: the frames stay visible and the tape may disappear.
- **Layout:**
  - At `>= 760px`: two columns, text left, collage right.
  - Below that: text, then the photos (a tidy stacked or staggered collage at full width). No horizontal overflow at 390.
  - Reserve space so there is no layout shift.
  - Match the neighbouring sections' backgrounds and vertical rhythm (`--space-section-*`).
- Tokens only. Add new tokens only if genuinely needed (e.g. a collage geometry value), in `tokens.css` plus `docs/design-system.md`, and say why. Component-scoped styles (ADR-0008). Any keyframes go in `styles/motion/`, but plain transitions are fine in the component.
- Use semantic markup, e.g. a `<section>` with `SectionHeading`, the text in `<p>`, and the photos in a `<ul>` of `<li><figure>`. The images are meaningful, so they need real alt text.

## Docs

- `docs/decisions/open-questions.md`: **D-34** (owner, 2026-10-28): the new "Outside of work" section, with its placement, the not-in-nav choice and the photo style.
- `docs/content/pl-copy-review.md`: regenerate with `node tools/i18n/export-copy.ts`. If the tool needs to learn the new module or content, extend it minimally.

## Allowed files

- New files: `apps/web/src/components/sections/Outside.astro`, `apps/web/src/content/outside.ts`, `apps/web/src/i18n/messages/outside.ts`, `apps/web/src/assets/outside/*`.
- Changes:
  - `apps/web/src/components/pages/HomePage.astro`: the section only.
  - `apps/web/src/components/sections/Guestbook.astro` and `Contact.astro`: the `index` prop only.
  - `apps/web/src/styles/tokens.css` and `docs/design-system.md`: only if a token is needed.
  - `apps/web/package.json` and `pnpm-lock.yaml`: only for `sharp`, and only if required.
  - `tools/i18n/export-copy.ts`: only if needed for the export.
  - `docs/decisions/open-questions.md`: D-34 only.
  - `docs/content/pl-copy-review.md`.
  - e2e specs or unit tests, only if they assert section numbering or order.
  - `tasks/T-071-outside-of-work.md`: commit this spec, prettier-formatted.
  - `tasks/reports/T-071/**`.

## Acceptance criteria

1. `/` and `/pl` show the section between Skills and Guestbook, numbered 04, with Guestbook 05 and Contact 06. The EN and PL copy is as above.
2. Three framed, rotated, taped photos look intentional at 390, 768, 1024 and 1440 in both locales. There is no horizontal overflow and no layout shift.
3. Images are served as AVIF/WebP with a fallback, lazy-loaded, with width/height and alt text. There are no `style=` attributes in `dist/` HTML.
4. Reduced motion: no transitions. Forced colours: frames are visible. axe is clean on `#outside`.
5. `pnpm verify` is green, including `check:budgets`.

## Validation

- `pnpm verify`.
- A throwaway Playwright script (not committed): `pnpm --filter @portfolio/web build`, then `pnpm --filter @portfolio/web exec astro preview --port 4411`.
  - **Use port 4411 only.** The owner runs `pnpm dev` on 3000/4321. Kill only PIDs you started.
  - Take screenshots of `#outside` at 390 and 1440, EN and PL. Keep at most 4 PNGs in `tasks/reports/T-071/screenshots/` and list them.
  - Assert `scrollWidth <= clientWidth`, then run axe on `#outside`.
  - Check the section headings' order and numbers.
- Grep `e2e/` for section numbers or order assertions. Don't run `pnpm test:e2e`.
- Open the PR via `"C:\Program Files\GitHub CLI\gh.exe"`, with a Conventional Commit containing `[T-071]`.
