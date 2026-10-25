# T-020: Implementation report, round 1

- **Branch:** `task/T-020-design-tokens`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** Sonnet 5.5

## Summary

Added the token set (`tokens.css`), global base/utilities/keyframes, Fonts API config (Fontsource, 4 families), `BaseLayout.astro` with the grid-background page wrapper, a dev-only `/__showcase` route via an Astro integration, and a Vitest guard for tokens. Both placeholder pages use `BaseLayout`. D-01 approved contrast values are implemented. The build needs network access (Fonts API downloads at build time).

## Files changed

| File                                                                       | Change                                      |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| `apps/web/src/styles/{tokens,base,utilities,keyframes}.css`                | added                                       |
| `apps/web/src/styles/tokens.test.ts`                                       | added: token guard (69 tests)               |
| `apps/web/src/layouts/BaseLayout.astro`                                    | added                                       |
| `apps/web/integrations/dev-showcase.ts`, `apps/web/src/dev/showcase.astro` | added                                       |
| `apps/web/astro.config.ts`                                                 | modified: `fonts`, integration registration |
| `apps/web/tsconfig.json`                                                   | modified: `include` adds `integrations`     |
| `apps/web/src/pages/index.astro`, `pl/index.astro`                         | modified: use BaseLayout                    |

## Acceptance criteria

| #    | Status | Evidence                                                                                                                                                                                                                                                                                                                   |
| ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | pass   | Every token of design-system §2 is in `tokens.css`. Test file asserts 66 representative values (all colour roles, all paints/tints, motion, layout) plus paint order and `:root`-only. Font-family tokens are produced by the Fonts API, not tokens.css.                                                                   |
| AC-2 | pass   | Build: "Copying fonts (12 files)"; 12 woff2 in `dist/_astro/fonts` = (Poppins 400/500/600 + Ubuntu 500 + JetBrains Mono 400 + Rubik Doodle Shadow 400) x (latin, latin-ext). Poppins 300 absent. Showcase renders `ąęśćżźńó`, `ŁOBOS` (screenshot `showcase-1440.png`); `document.fonts` shows the latin-ext faces loaded. |
| AC-3 | pass   | `dist/index.html` preloads only Rubik Doodle Shadow files (2 links: its latin and latin-ext subsets, the Fonts API preloads all subsets of the family).                                                                                                                                                                    |
| AC-4 | pass   | `curl localhost:4320/__showcase` returns 200 in dev. `ls apps/web/dist` gives `_astro index.html pl.html robots.txt`; no showcase.                                                                                                                                                                                         |
| AC-5 | pass   | Computed: `background-size: 235px 106px`, colour `rgb(236,236,234)` lines on `rgb(247,247,246)`; `home-1440.png` cell boundaries (x=235, 470..; y=106, 212..) match `desktop-1440-hero.png`.                                                                                                                               |
| AC-6 | pass   | Playwright with `reducedMotion: reduce`: `scroll-behavior: auto` (smooth otherwise). After Tab on a link: outline `solid 2px rgb(42,100,224)`, offset 3px (`focus-ring.png`).                                                                                                                                              |

## Validation output

```
$ pnpm verify
format:check, lint: clean
typecheck: astro check 0 errors, 0 warnings
test: apps/web Tests 69 passed (69)
build: astro check 0 errors; 2 page(s) built; Copying fonts (12 files)...   (exit 0)
$ ls apps/web/dist -> _astro index.html pl.html robots.txt
```

## Tests added

- `apps/web/src/styles/tokens.test.ts`: values of colours (D-01 values), paints and tints in order, type/spacing/layout samples, motion, `:root`-only and no `--font-*`.

## Screenshots

`tasks/reports/T-020/screenshots/`: `showcase-1440.png`, `showcase-390.png`, `home-1440.png`, `home-390.png`, `focus-ring.png`. (The dark pill at the bottom is the Astro dev toolbar, not page content.) Screenshots taken with a temporary playwright-core outside the repo.

## Assumptions

- Added `--leading-*` tokens for each type role with a single line-height (small uses 1.7 of the design's 1.65-1.7) and `--focus-ring-offset: 3px`, since the doc folds offset into `--focus-ring`.
- Keyframes: only the four listed (no `blink`; design-system §1 mentions it but the task and §2.8 list four).
- `BaseLayout` takes optional `title` and `lang` props (T-021 will extend); the page wrapper is a scoped `.page` div.
- Showcase applies tokens via `element.style.setProperty` from a script (no `style=` attributes; dev HTML has 0).
- Fixed `scroll-behavior: smooth` is applied only under `prefers-reduced-motion: no-preference`.

## Deviations

- None. Preload emits two links (both subsets of the display font) rather than one file; still a single font family.

## Change Requests

- None. Note for T-016: this task touched only `fonts`, `integrations` and the import in `astro.config.ts`; expect a trivial merge there.

## Open issues

- Verified in dev/build only on Windows with Chrome; the font build requires network.
