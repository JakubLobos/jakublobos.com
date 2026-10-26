# Design system and token strategy

Single source of truth for visual values: **`apps/web/src/styles/tokens.css`** (owned by task T-020). Every value below was extracted from [`design/extracted/design-source.html`](design/extracted/design-source.html). Component-level specifications are in [`design-analysis.md`](design-analysis.md).

## 1. Architecture of the styles

```
apps/web/src/styles/
  tokens.css      custom properties only (:root). No selectors other than :root.
  base.css        reset, element defaults (html, body, a, ::selection, placeholders,
                  focus ring), hidden native scrollbar, reduced-motion defaults
  utilities.css   tiny set: .visually-hidden, .full-bleed, .container (main width + side padding)
  keyframes.css   shared @keyframes (type-in, spin, marquee-ltr, marquee-rtl); the mascot blink uses the Web Animations API
```

- Global CSS is imported **once** in `BaseLayout.astro`.
- Component styles live in the component's scoped `<style>` block. Avoid `:global()` except to style slotted or third-party markup, and comment why if you use it.
- **No CSS framework** (no Tailwind) and no CSS-in-JS. See [ADR-0008](decisions/0008-plain-css-with-design-tokens.md).

## 2. Token reference

### 2.1 Colour: semantic roles

| Token                                   | Value                                   | Use                                                                   | Design name |
| --------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- | ----------- |
| `--color-bg`                            | `#f7f7f6`                               | page background, band background                                      | `--bg`      |
| `--color-surface`                       | `#fbfbfa`                               | cards, secondary buttons, eye whites                                  | `--surface` |
| `--color-ink`                           | `#2b2b2b`                               | primary text, borders, hard shadows                                   | `--ink`     |
| `--color-text-body`                     | `#3d3d3b`                               | bullet lists, cookie text                                             | `--body`    |
| `--color-text-secondary`                | `#5c5c5a`                               | descriptions, lead text                                               | `--muted2`  |
| `--color-text-muted`                    | **`#717170`** (design: `#7a7a78`; D-01) | eyebrows, labels, footer, **placeholders, counters**                  | `--muted`   |
| `--color-text-faint`                    | `#a9a9a6`                               | inactive timeline entries only (decorative state)                     | `--faint`   |
| `--color-line`                          | `#e4e4e1`                               | row separators                                                        | `--line`    |
| `--color-line-strong`                   | `#d6d6d3`                               | timeline track, divider, scrollbar track                              | `--line2`   |
| `--color-grid`                          | `#ececea`                               | background grid lines                                                 | `--grid`    |
| `--color-hover`                         | `#e4e4e0`                               | nav pill hover/current                                                | `--hover`   |
| `--color-primary`                       | `#2a64e0`                               | primary button, focus border, link hover                              | —           |
| `--color-primary-hover`                 | `#3570ea`                               | primary hover, sending state                                          | —           |
| `--color-primary-edge`                  | `#1a3f94`                               | primary border and hard shadow                                        | —           |
| `--color-on-primary`                    | `#ffffff`                               | text on primary                                                       | —           |
| `--color-highlight`                     | `#fdf25c`                               | secondary hover, `::selection`, success button, scrollbar thumb hover | yellow      |
| `--color-on-highlight`                  | `#1f1f1e`                               | text on yellow                                                        | —           |
| `--color-danger`                        | `#c23b4c`                               | field error line and text                                             | —           |
| `--color-tech`                          | **`#1778ae`** (design: `#1f9fe6`; D-01) | hero "react", "typescript"                                            | —           |
| `--color-tag`                           | **`#1877b4`** (design: `#1a7fc0`; D-01) | project tags                                                          | —           |
| `--color-marker`                        | `#f9c9c9`                               | "figma" marker highlight                                              | `--figma`   |
| `--color-focus`                         | `#2a64e0`                               | `:focus-visible` ring (addition, D-19)                                | —           |
| `--color-overlay`                       | `rgb(43 43 43 / 0.28)`                  | modal backdrop                                                        | —           |
| `--color-cookie`, `--color-cookie-chip` | `#e8b778`, `#5a3a22`                    | cookie illustration                                                   | —           |

### 2.2 Colour: paint palette

The paint palette appears in the drips, marquee, timeline, guestbook, and blush. The order is significant (drip order, marquee cycling).

| Paint ID (API)     | Token            | Swatch    | Tint token            | Tint                    |
| ------------------ | ---------------- | --------- | --------------------- | ----------------------- |
| `red`              | `--paint-red`    | `#e05a6a` | `--paint-red-tint`    | `rgb(224 90 106 / .35)` |
| `coral`            | `--paint-coral`  | `#ff7a5c` | `--paint-coral-tint`  | `rgb(255 122 92 / .40)` |
| `yellow` (default) | `--paint-yellow` | `#fdf25c` | `--paint-yellow-tint` | `rgb(253 242 92 / .85)` |
| `purple`           | `--paint-purple` | `#a334d0` | `--paint-purple-tint` | `rgb(163 52 208 / .30)` |
| `violet`           | `--paint-violet` | `#7b5cff` | `--paint-violet-tint` | `rgb(123 92 255 / .32)` |
| `blue`             | `--paint-blue`   | `#2e88d0` | `--paint-blue-tint`   | `rgb(46 136 208 / .32)` |

Paint **IDs** are part of the API contract (`packages/contracts`). The **colours** are presentation and live only in `tokens.css`. The web app maps ID → token (`var(--paint-${id})`) and never sends colours over the wire.

### 2.3 Typography

| Token            | Value                                      |
| ---------------- | ------------------------------------------ |
| `--font-display` | `'Rubik Doodle Shadow', cursive` (400)     |
| `--font-body`    | `'Poppins', sans-serif` (400, 500, 600)    |
| `--font-ui`      | `'Ubuntu', sans-serif` (500; buttons only) |
| `--font-mono`    | `'JetBrains Mono', monospace` (400)        |

The font-family custom properties are produced by the **Astro Fonts API** (`cssVariable` in `astro.config.ts`), which self-hosts the files with subsets `latin` + `latin-ext` (Polish needs `ą ć ę ł ń ó ś ź ż`). Poppins 300 is in the bundle but unused, so don't ship it. Preload only `--font-display` (hero LCP text).

Type roles. Font sizes are in **rem** (px ÷ 16), so user font-size settings are respected; at the default 16 px they're pixel-identical to the design.

| Token (size / line-height)             | px in design                    | Where                                               |
| -------------------------------------- | ------------------------------- | --------------------------------------------------- |
| `--text-display` / `--leading-display` | `clamp(40px,6vw,68px)` / 1.1    | hero h1                                             |
| `--text-h2` / `--leading-heading`      | `clamp(34px,4vw,46px)` / 1.15   | section titles                                      |
| `--text-menu`                          | `clamp(34px,10vw,48px)` / 1.15  | mobile menu links                                   |
| `--text-dialog-title`                  | 34px / 1.15                     | modal h3                                            |
| `--text-quote`                         | `clamp(24px,3.2vw,36px)` / 1.45 | last-visitor quote                                  |
| `--text-h3`                            | 24px / 1.3                      | experience title                                    |
| `--text-lead`                          | `clamp(17px,1.6vw,20px)` / 1.7  | hero intro                                          |
| `--text-title`                         | 19px / 1.35                     | project title                                       |
| `--text-skill`                         | `clamp(16px,2vw,18px)` / 1.7    | skill items                                         |
| `--text-marquee`                       | `clamp(15px,1.5vw,19px)` / 1.2  | bands                                               |
| `--text-logo`                          | 18px / 1.3                      | logo name                                           |
| `--text-modal-quote`                   | 18px / 1.5                      | modal echo                                          |
| `--text-field`                         | 17px / 1.5                      | inputs, primary buttons, org names                  |
| `--text-ui`                            | 16px                            | menu/close button                                   |
| `--text-body`                          | 15px / 1.7                      | body, project desc, nav (15)                        |
| `--text-small`                         | 14px / 1.65–1.7                 | sub-titles, cookie text, modal body                 |
| `--text-caption`                       | 13px / 1.5–1.6                  | footer, errors, status, project org, eyebrow (mono) |
| `--text-label`                         | 12px                            | mono labels, dates, counters, aside                 |

Line heights are tokens too (added in T-020, approved): `--leading-display 1.1`, `--leading-heading 1.15`, `--leading-quote 1.45`, `--leading-h3 1.3`, `--leading-lead 1.7`, `--leading-title 1.35`, `--leading-skill 1.7`, `--leading-marquee 1.2`, `--leading-logo 1.3`, `--leading-modal-quote 1.5`, `--leading-field 1.5`, `--leading-body 1.7`, `--leading-small 1.7`, `--leading-caption 1.5`, plus `--leading-cookie 1.65` (cookie banner text) and `--leading-status 1.6` (contact status line), added by T-021.

Weights: `--weight-regular 400`, `--weight-medium 500`, `--weight-semibold 600`.
Tracking: `--tracking-logo .02em`, `--tracking-date .04em`, `--tracking-label .06em`, `--tracking-wide .08em`, `--word-spacing-skill .15em`.

### 2.4 Spacing

The design uses exact pixel values. Tokens are named by their px value so they map 1:1 to the design (no translating between "space-5" and 20 px):

`--space-2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 22 · 24 · 28 · 32 · 36 · 40 · 48 · 56 · 64 · 80`

Fluid spacing tokens:

| Token                   | Value                    | Use                                                    |
| ----------------------- | ------------------------ | ------------------------------------------------------ |
| `--space-section-block` | `clamp(64px,10vw,96px)`  | vertical padding: projects, skills, guestbook, contact |
| `--space-section-gap`   | `clamp(32px,5vw,48px)`   | header-to-content gap                                  |
| `--space-guestbook-gap` | `clamp(36px,6vw,56px)`   | guestbook column gap                                   |
| `--space-contact-gap`   | `clamp(48px,7vw,80px)`   | contact grid gap                                       |
| `--space-contact-end`   | `clamp(80px,12vw,140px)` | contact bottom padding                                 |
| `--space-exp-cols`      | `clamp(32px,6vw,80px)`   | experience column gap                                  |
| `--space-exp-stage`     | `clamp(48px,8vw,64px)`   | sticky stage padding                                   |

### 2.5 Layout

| Token                                                                                       | Value                                                                            |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `--content-max`                                                                             | `1000px`                                                                         |
| `--gutter-wide` / `--gutter-narrow`                                                         | `clamp(56px,6vw,72px)` / `clamp(20px,5vw,40px)`                                  |
| `--header-pad`                                                                              | `clamp(14px,2.4vw,24px) clamp(20px,4vw,56px) clamp(12px,2vw,20px)`               |
| `--scroll-offset`                                                                           | `88px` (scroll-padding-top)                                                      |
| `--grid-cell-w` / `--grid-cell-h`                                                           | `235px` / `106px`                                                                |
| `--drips-left`                                                                              | `clamp(160px,19vw,300px)`                                                        |
| `--hl-start`                                                                                | `55%` (marker highlight start)                                                   |
| `--intro-max` / `--divider-w`                                                               | `560px` / `40px` (hero intro measure, divider rule; T-024)                       |
| `--z-skip`                                                                                  | `10` (skip link above `.page`; T-021)                                            |
| `--project-index-col` / `--project-index-gap`                                               | `clamp(32px,6vw,48px)` / `clamp(12px,2.4vw,24px)` (project number column; T-027) |
| `--project-main-basis` / `--project-meta-basis` / `--project-desc-max`                      | `340px` / `200px` / `560px` (project row)                                        |
| `--skill-label-basis` / `--skill-items-basis`                                               | `180px` / `280px` (skills rows)                                                  |
| `--z-drips 1 · --z-content 2 · --z-aside 3 · --z-header 4 · --z-scrollbar 5 · --z-cookie 8` | stacking; dialogs use the native top layer                                       |

### 2.6 Breakpoints

CSS custom properties can't be used inside media queries, so breakpoints are constants. They are documented here and mirrored in `apps/web/src/lib/breakpoints.ts` for `matchMedia`. Use **range syntax**:

| Name               | Query                               | Meaning                                                                 |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------- |
| mobile             | `(width < 760px)`                   | burger menu, no custom scrollbar, small drips, full-width cookie banner |
| narrow             | `(width < 980px)`                   | no social aside, narrow gutters, footer clears drips                    |
| compact-experience | `(width < 820px), (height < 760px)` | stacked experience list                                                 |

### 2.7 Shape, borders, shadows

| Token                                               | Value                                                                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `--radius-sm` / `--radius-md` / `--radius-lg`       | `6px` / `8px` / `12px`                                                                                                                 |
| `--radius-drip`                                     | `11px`                                                                                                                                 |
| `--radius-sketch`                                   | `255px 15px 225px 15px / 15px 225px 15px 255px` (scrollbar thumb)                                                                      |
| `--border-thick` / `--border-hairline`              | `2px` / `1px`                                                                                                                          |
| `--press-rest` / `--press-hover` / `--press-active` | `6px` / `8px` / `1px` (hard-shadow Y offsets, large buttons)                                                                           |
| `--press-sm-rest` / `--press-sm-hover`              | `4px` / `5px` (small and chrome buttons)                                                                                               |
| `--lift-hover` / `--sink-active`                    | `-2px` / `5px` (translateY)                                                                                                            |
| `--shadow-card`                                     | `0 8px 0 var(--color-ink)` (cookie banner)                                                                                             |
| `--shadow-dialog`                                   | `0 10px 0 var(--color-ink)` (modal)                                                                                                    |
| `--shadow-thumb`                                    | `2px 3px 0 var(--color-ink)`                                                                                                           |
| `--ring-swatch`                                     | `0 0 0 3px var(--color-bg), 0 0 0 5px var(--color-ink)`                                                                                |
| `--focus-ring` / `--focus-ring-offset`              | `2px solid var(--color-focus)` / `3px` (addition, D-19; the offset is a separate token because the `outline` shorthand can't carry it) |

### 2.8 Motion

| Token                | Value                       | Use                                |
| -------------------- | --------------------------- | ---------------------------------- |
| `--duration-press`   | 120ms                       | buttons                            |
| `--duration-hover`   | 150ms                       | nav pills, swatches, field borders |
| `--duration-state`   | 200ms                       | timeline dot and colour            |
| `--duration-page`    | 250ms                       | mascot hover                       |
| `--duration-tint`    | 300ms                       | quote tint                         |
| `--duration-panel`   | 350ms                       | experience cross-fade              |
| `--duration-type`    | 240ms                       | per-character type-in              |
| `--duration-blink`   | 180ms                       | mascot blink                       |
| `--duration-spin`    | 700ms                       | spinner                            |
| `--duration-marquee` | 45s                         | bands                              |
| `--ease-standard`    | `ease`                      | default                            |
| `--ease-spring`      | `cubic-bezier(.3,1.6,.5,1)` | mascot hover                       |
| `--ease-type`        | `cubic-bezier(.2,.8,.2,1)`  | type-in                            |

Keyframes (`keyframes.css`): `type-in` (`0% translateY(.6em) rotate(4deg) opacity 0 → 60% translateY(-.08em) opacity 1 → 100% none`), `spin`, `marquee-ltr`, `marquee-rtl`.

### 2.9 Controls (T-022)

Button, icon and heading-measure geometry. Button geometry isn't decor, so it uses these tokens instead of local literals (§3 rule 1).

| Token                                                    | Value                                     | Use                                      |
| -------------------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `--text-button-lg` / `--text-button-sm`                  | aliases of `--text-field` / `--text-body` | button labels                            |
| `--space-18`                                             | 18px                                      | small-button inline padding              |
| `--control-min-h`                                        | 44px                                      | small/chrome button min height           |
| `--control-submit-w` / `--control-submit-h`              | 210px / 52px                              | contact submit min size                  |
| `--lift-sm-hover` / `--sink-sm-active`                   | -1px / 3px                                | small-button hover lift and press sink   |
| `--press-busy` / `--sink-busy`                           | 2px / 4px                                 | busy ("sending") resting offset          |
| `--icon-spinner`, `--icon-check`                         | 16px, 18px                                | status icons                             |
| `--icon-menu-w` / `--icon-menu-w-short`, `--icon-close`  | 16px / 10px, 14px                         | Menu bars, Close cross                   |
| `--title-max-narrow` / `--title-max-wide`                | 520px / 640px                             | `SectionHeading` title measure           |
| `--hl-end`                                               | 92%                                       | `Highlight` band end (with `--hl-start`) |
| `--nav-gap`                                              | `clamp(4px,1vw,12px)`                     | desktop nav item gap (T-023)             |
| `--nav-pill-y` / `--nav-pill-x` / `--nav-pill-x-compact` | 6px / 12px / 10px                         | nav and language-switcher pill padding   |
| `--leading-logo-mark`                                    | 1.55                                      | logo mark line height                    |

## 3. Rules for consuming tokens

1. **Components use semantic tokens only.** No raw hex, rgb, or font-family values outside `tokens.css`. Allowed literals: `0`, `1px` hairlines, `100%`, `auto`, and the **illustration geometry** of decor components (mascot shapes, cookie chips, drip heights). Keep that geometry in a local custom-property block at the top of the component's `<style>`.
   Reviewer check: `rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(" apps/web/src --glob '!**/styles/tokens.css'` must return only decor geometry exceptions.
2. **Paint colours are only accessed by ID**: `var(--paint-<id>)` or `var(--paint-<id>-tint)`. To set one at runtime, use `el.style.setProperty('--tint', 'var(--paint-yellow-tint)')`.
3. **No `style="…"` attributes and no `define:vars`.** Both produce inline styles that the CSP blocks ([ADR-0012](decisions/0012-content-security-policy.md)). Dynamic values go through CSSOM (`element.style.setProperty`) or data attributes plus CSS (`[data-state="active"]`).
4. **One button implementation.** `components/ui/Button.astro` (variants `primary | secondary`, sizes `lg | sm`, renders `<a>` or `<button>`) plus `ChromeButton.astro` (Menu/Close). No ad-hoc button styles.
5. **Section headings** come only from `components/ui/SectionHeading.astro` (eyebrow index + title, alignment prop).
6. **Motion is opt-in.** Wrap transitions and animations that move things in `@media (prefers-reduced-motion: no-preference) { … }`. Colour and opacity transitions under 200 ms may stay unconditional.
7. **Focus:** never remove an outline without replacing it. `:focus-visible` uses `--focus-ring`. Text fields keep the design's underline-colour focus state _and_ get a ring when focused by keyboard (D-19).
8. **Forced colours:** in `@media (forced-colors: active)`, hide the typing mirrors, drips, and the hero mascot (its pupils, brows, and fills depend on colour) and restore the native field text colour. Hard shadows disappear by default; add `border` fallbacks where meaning depends on shadow.
9. **Breakpoints:** only the three in §2.6. Prefer intrinsic layout (`clamp`, `auto-fit`, `flex-wrap`) over new breakpoints.
10. **Changing a token is a shared-surface change.** Only T-020 creates `tokens.css`. Later tasks request changes in their completion report ([`agent-workflow.md`](agent-workflow.md#shared-surfaces)).

## 4. Accessibility adjustments approved (D-01)

| Token                   | Design                                          | Contrast on `--color-bg` | Proposed                                                                                                             | New contrast |
| ----------------------- | ----------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------ |
| `--color-text-muted`    | `#7a7a78`                                       | 4.01                     | `#717170`                                                                                                            | 4.53         |
| counter and placeholder | `#a9a9a6` (`--faint`)                           | 2.20                     | use `--color-text-muted`                                                                                             | 4.53         |
| `--color-tech`          | `#1f9fe6`                                       | 2.74                     | `#1778ae`                                                                                                            | 4.52         |
| `--color-tag`           | `#1a7fc0`                                       | 4.05                     | `#1877b4`                                                                                                            | 4.53         |
| marquee word colours    | coral 2.39 / red 3.35 / violet 4.07 / blue 3.53 | —                        | **keep**: the band is decorative and duplicated in Skills, so it's `aria-hidden` with an accessible text alternative | —            |

Approved by the owner on 2026-10-25. T-020 implements the **new values**; the marquee keeps the design colours (decorative, `aria-hidden`, text alternative provided).
