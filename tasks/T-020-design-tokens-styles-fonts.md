# T-020: Design tokens, global styles, fonts, base layout shell, dev showcase

|                          |                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| **Wave**                 | 2                                                                                             |
| **Depends on**           | T-001                                                                                         |
| **Blocked by decisions** | none. D-01 answered: implement the **approved contrast values** (`design-system.md` §2.1, §4) |
| **Parallel with**        | T-010, T-011                                                                                  |
| **Size**                 | M                                                                                             |
| **Requirements**         | NFR-01, NFR-02, NFR-03                                                                        |

## Objective

Create the visual foundation every component consumes: the complete token set, global base styles, self-hosted fonts via the Astro Fonts API, the page-wrapper shell with the grid background, and a **dev-only** showcase page for reviewing tokens and primitives.

## References

- `docs/design-system.md` (entire; tokens must match it 1:1)
- `docs/design-analysis.md` §2 (wrapper, layering), §5 (global styles)
- `docs/design/extracted/design-source.html` L17–32 (global CSS and grid)
- `docs/decisions/0008-plain-css-with-design-tokens.md`, `0012-content-security-policy.md`
- `docs/research.md` §3 (Fonts API)

## Scope

- `apps/web/src/styles/tokens.css`: every token in `design-system.md` §2 (colour roles, paints and tints, type, spacing, layout, shape, motion). `:root` only.
- `apps/web/src/styles/base.css`:
  - reset (`box-sizing`, margins), `html` (`scroll-behavior: smooth` gated on `prefers-reduced-motion: no-preference`, `scroll-padding-top`, hidden native scrollbar per design)
  - `body` (Poppins, `--color-bg`, ink, antialiased)
  - links (ink, hover `--color-primary`), `::selection`, placeholders, `:focus-visible` ring (D-19)
  - `@media (forced-colors: active)` basics
- `apps/web/src/styles/utilities.css`: `.visually-hidden`, `.container` (max width + responsive gutters), `.full-bleed`.
- `apps/web/src/styles/keyframes.css`: `type-in`, `spin`, `marquee-ltr`, `marquee-rtl`.
- `astro.config.ts` `fonts`: Fontsource provider; Poppins 400/500/600, Ubuntu 500, JetBrains Mono 400, Rubik Doodle Shadow 400; subsets `latin`, `latin-ext`; `cssVariable`s `--font-body`, `--font-ui`, `--font-mono`, `--font-display`; fallbacks per family.
- `apps/web/src/layouts/BaseLayout.astro` (shell): `<html>`, `<head>` with charset and viewport, `<Font>` for all four (preload **only** `--font-display`), and global CSS imports; `<body>` with the page wrapper (`min-height: 100vh`, grid background 235×106 using `--color-grid`, `overflow-x: clip`) and a default `<slot />`. T-021 adds lang, SEO, and chrome.
- Dev showcase:
  - `apps/web/integrations/dev-showcase.ts`: an Astro integration that calls `injectRoute({ pattern: '/__showcase', entrypoint: './src/dev/showcase.astro' })` **only when `command === 'dev'`**
  - `apps/web/src/dev/showcase.astro`: colour swatches with token names, type ramp, spacing scale, radii and shadows, paint palette with tints
- Update the placeholder pages to use `BaseLayout`.

## Out of scope

Components (T-022+), i18n and SEO (T-021).

## Allowed files

`apps/web/tsconfig.json` (extend `include` for new web-root TS files only; T-001 review note), `apps/web/src/styles/**`, `apps/web/src/layouts/BaseLayout.astro`, `apps/web/astro.config.ts` (`fonts` + integration registration), `apps/web/integrations/**`, `apps/web/src/dev/**`, `apps/web/src/pages/index.astro` and `pl/index.astro` (layout usage only).

## Implementation notes

- Font sizes in **rem** (px ÷ 16), keeping `clamp()` structure: `clamp(2.5rem, 6vw, 4.25rem)`.
- Don't ship Poppins 300 (unused).
- The Fonts API downloads at build time, so the build needs network access. Note this in the report.
- No `style=` attributes anywhere. The showcase uses classes, or `data-token` attributes plus small scripts, or CSS that sets swatch backgrounds through `[data-token="…"]` selectors.

## Acceptance criteria

- **AC-1** Every token in `design-system.md` §2 exists with the documented value. The reviewer diffs them; the report includes a token checklist.
- **AC-2** `pnpm build` emits self-hosted WOFF2 files for exactly the listed families and weights, including `latin-ext` (Polish glyphs render: check `ŁOBOS`, `ąęśćżźńó` in the showcase).
- **AC-3** Only one font is preloaded (display).
- **AC-4** `/__showcase` works in `pnpm dev` and **doesn't exist** in `apps/web/dist` after `pnpm build` (assert in the report: `ls dist`).
- **AC-5** The placeholder home renders the grid background matching `design/screenshots/desktop-1440-hero.png` cell size and colour.
- **AC-6** With reduced motion, `scroll-behavior` is `auto`. `:focus-visible` shows the ring on links.

## Tests required

A Vitest test that parses `tokens.css` and asserts the presence and values of a representative set: all colour roles, all paints and tints, and the motion tokens. This guards against accidental edits.

## Validation

```
pnpm verify
pnpm --filter @portfolio/web dev   # visit /__showcase
ls apps/web/dist                   # no __showcase
```

## Definition of done

Standard DoD plus showcase screenshots (1440 + 390) in the report.
