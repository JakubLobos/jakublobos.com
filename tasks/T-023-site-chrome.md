# T-023: Site chrome: header, nav, mobile menu, social aside, footer, language switcher, skip link

|                          |                                           |
| ------------------------ | ----------------------------------------- |
| **Wave**                 | 4                                         |
| **Depends on**           | T-021, T-022                              |
| **Blocked by decisions** | none (D-08, D-09, D-16 answered)          |
| **Parallel with**        | T-024…T-028, T-031, T-014, T-040          |
| **Size**                 | L                                         |
| **Requirements**         | FR-04, FR-10, FR-11, FR-12, FR-13, NFR-02 |

## Objective

Implement all persistent page chrome with exact design fidelity and full keyboard and screen-reader support.

## References

- `docs/design-analysis.md` §4.1, §4.2, §4.3, §4.15, §3 (breakpoints), §6 (DF-1, DF-3, DF-8)
- `docs/design/extracted/design-source.html` L34–52, L65–71, L320–323, L342–379, L490–492, L516–519, L600
- Screenshots: `desktop-1440-hero.png`, `desktop-1440-projects.png` (nav current pill), `mobile-390-hero.png`, `mobile-390-menu-open.png`, `desktop-1440-footer.png`
- `docs/architecture.md` §4.3 (custom-element pattern, dialogs), §6 (switcher behaviour)
- `docs/decisions/open-questions.md` D-08, D-09, D-16, D-19

## Scope

- `site/Header.astro` (logo, `DesktopNav`, menu button), `site/DesktopNav.astro`, and `scripts/scroll-spy.ts`. The current section is the last section whose top is above 40 % of the viewport height. Set `aria-current="location"` and the pill state. Use `IntersectionObserver`, or a rAF-throttled scroll handler if needed for exact parity.
- Header scrolled state (D-16): **mobile only** (`width < 760px`). `data-scrolled` when `scrollY > 8` → `--color-bg` at 90 % + `backdrop-filter: blur(6px)` + a 1 px `--color-line` bottom border. Desktop stays transparent exactly as designed. Keep it in one isolated CSS rule block commented `D-16`.
- `site/MobileMenu.astro` + `scripts/mobile-menu.ts`:
  - native `<dialog>` + `showModal()`, full-screen per §4.2, with its own drips (`PaintDrips variant="menu"`)
  - closes on Close, Escape, link click, and resize to ≥ 760
  - restores focus to the Menu button
  - sets `document.documentElement.dataset.menuOpen` while open (the cookie banner hides on it; contract for T-032)
  - body scroll lock without layout jump
- `site/SocialAside.astro` (≥ 980 only, CSS).
- `site/Footer.astro`: © year (build-time), "Back to top ↑", plus D-09 links: "Privacy" (`/privacy` or `/pl/privacy`) and "Cookie settings". The latter is a `<button type="button" data-cookie-settings>`, a contract for T-032, which attaches behaviour; without T-032 it does nothing visible.
- `site/LanguageSwitcher.astro` (D-08): plain links to `/set-language?lang=<target>&to=<equivalent path>` (handled by the Worker, T-016). Each link has `hreflang`, `lang`, and a localized `aria-label` ("Polski" / "English"); the current locale is rendered as non-link text with `aria-current="true"`. **Visual spec (must feel native to the design system):** `EN / PL` in `--font-mono` 13 px, letter-spacing `--tracking-label`, uppercase; each item uses the nav-pill metrics (padding 6 × 10, `--radius-sm`, hover `--color-hover`, 150 ms); the current item is `--color-ink` with a 2 px ink underline offset 4 px; the inactive item is `--color-text-muted`; the separator `/` is `--color-line-strong`. Desktop: right of the nav, separated by 16 px and a 1 × 16 px `--color-line-strong` divider. Mobile menu: in the bottom row next to the socials, same styling at 12 px. Add it to the dev showcase and include side-by-side screenshots with the nav in the report.
- `site/SkipLink.astro`: "Skip to content" → `#top`, visible on focus.
- Message modules: `messages/nav.ts`, `messages/footer.ts` (EN from design + PL drafts).

## Out of scope

The cookie banner itself (T-032), custom scrollbar (T-031), drips layer (T-024).

## Allowed files

`apps/web/src/components/site/{Header,DesktopNav,MobileMenu,SocialAside,Footer,LanguageSwitcher,SkipLink}.astro`, `apps/web/src/scripts/{scroll-spy,mobile-menu}.ts`, `apps/web/src/lib/` (new pure helpers + tests only), `apps/web/src/i18n/messages/{nav,footer}.ts`.

## Interfaces / contracts

- `html[data-menu-open]` while the mobile menu is open.
- `[data-cookie-settings]` button in the footer.
- Header height is compatible with `--scroll-offset: 88px` (anchor jumps don't hide headings).

## Acceptance criteria

- **AC-1** Visual parity at 1440, 1024, 768, and 390 with the referenced screenshots (logo, nav spacing, pill, Menu button, menu overlay typography, footer).
- **AC-2** Nav: Tab reaches every link in order. The current section updates while scrolling. Clicking a link scrolls with the header offset.
- **AC-3** Mobile menu:
  - focus moves into the dialog and Tab is contained
  - Escape, Close, and link click all close it and return focus
  - the background is inert and doesn't scroll
  - at ≥ 760 it auto-closes
- **AC-4** The switcher works without JS. On `/pl`, the EN link targets `/set-language?lang=en&to=/`. On `/privacy`, the PL link targets `/set-language?lang=pl&to=/pl/privacy`. The visual spec is met at 1440 and 390 (screenshots).
- **AC-5** axe clean for the header, open menu, and footer. The skip link is first in tab order and visible on focus.
- **AC-6** Reduced motion: no smooth-scroll animation and no menu transitions.

## Validation

```
pnpm verify
pnpm preview   # manual keyboard + screen reader smoke (NVDA or VoiceOver) documented in report
pnpm test:e2e --grep @chrome   # if T-040 has merged; add specs under e2e/chrome.spec.ts (allowed)
```

(If T-040 has merged, `e2e/chrome.spec.ts` is an allowed file.)

## Definition of done

Standard DoD plus screenshots at 4 widths, closed and open menu, and the list of PL strings.
