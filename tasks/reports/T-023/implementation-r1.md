# T-023: Implementation report, round 1

- **Branch:** `task/T-023-site-chrome` (see the commit on the branch)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

All persistent chrome is implemented in the T-021 stubs (props unchanged) plus the new `DesktopNav.astro`: sticky header with logo, nav pills, desktop switcher and Menu button; native-`<dialog>` mobile menu; social aside; footer with Privacy and `[data-cookie-settings]`; skip link; language switcher. Behaviour lives in two custom elements (`scroll-spy`, `mobile-menu`) and pure helpers in `lib/nav.ts`. Nav links point to `/#id` or `/pl#id` when the page is not the home page, so the header also works on privacy and 404.

## Files changed

| File                                                                    | Change                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `components/site/{Header,MobileMenu,SocialAside,Footer,SkipLink}.astro` | modified: stubs replaced                                                   |
| `components/site/LanguageSwitcher.astro`                                | modified: visual spec, no-JS links, `--switcher-size` hook                 |
| `components/site/Logo.astro`                                            | added: shared logo link (CR-1)                                             |
| `components/site/DesktopNav.astro`                                      | added: nav pills inside `<scroll-spy>`                                     |
| `scripts/scroll-spy.ts`, `scripts/mobile-menu.ts`                       | added: custom elements                                                     |
| `lib/nav.ts`, `lib/nav.test.ts`                                         | added: `NAV_SECTIONS`, `SOCIAL_LINKS`, `navHref`, `currentSection` + tests |
| `i18n/messages/nav.ts`, `i18n/messages/footer.ts`                       | added: EN + PL copy                                                        |
| `dev/showcase.astro`                                                    | modified: "Language switcher" section appended (spec asks for it)          |
| `tasks/reports/T-023/`                                                  | report and screenshots                                                     |

## Acceptance criteria

| #    | Criterion (short)         | Status | Evidence                                                                                                                                                                                                                                                                                        |
| ---- | ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Visual parity at 4 widths | PASS   | `screenshots/{1440,1024,768,390}-closed.png`, `*-footer.png`, `390-menu-open.png` compared by eye with `desktop-1440-projects/footer.png`, `mobile-390-menu-open.png`. Differences: none seen beyond the added switcher and footer links.                                                       |
| AC-2 | Nav order, spy, offset    | PASS   | Playwright run (system Chrome, throwaway script outside the repo): tab order logo, 5 links, PL, socials; current section changes Experience, Projects, Skills, Guestbook while scrolling; click on `#skills` lands at top 88 px; `currentSection` tests in `lib/nav.test.ts`.                   |
| AC-3 | Mobile menu               | PASS   | Same run: focus goes to Close; Tab wraps Close, links, Reach me out, socials, PL, logo, Close and never leaves; Esc, Close, link click and resize to 800 px all close it and focus the Menu button; `html[data-menu-open]` set and cleared; wheel does not scroll the page (300 to 300).        |
| AC-4 | Switcher without JS       | PASS   | Built HTML: `/pl` has `/set-language?lang=en&to=/`, `/privacy` has `lang=pl&to=/pl/privacy`; `hreflang`, `lang`, localized `aria-label`; current locale is a `<span aria-current="true">`. `1440-header-nav-switcher.png`, `showcase-switcher.png`, `390-menu-open.png`, `1440-pl-privacy.png`. |
| AC-5 | axe, skip link            | PASS   | axe-core 0 violations on home desktop, mobile menu open, mobile menu closed. Skip link is first Tab stop and visible on focus (`1440-skiplink-focus.png`). Footer is in the desktop run. Manual NVDA/VoiceOver smoke not done (no screen reader on this host).                                  |
| AC-6 | Reduced motion            | PASS   | `scroll-behavior` computes to `auto` under `reducedMotion: reduce`; all transitions sit in `prefers-reduced-motion: no-preference`; the menu has none.                                                                                                                                          |

D-16: mobile header after scroll measured as `rgb(247 247 246 / 0.9)`, `blur(6px)`, 1 px border; desktop stays transparent with no border (`390-scrolled.png`).

## Validation output

```
$ pnpm verify          (exit 0)
All matched files use Prettier code style!
eslint: no problems
apps/web typecheck: 0 errors, 0 warnings, 0 hints
contracts 153 passed · server 263 passed · web 104 passed (7 files, +6 new in nav.test.ts)
apps/web build: 6 page(s) built, Complete!
```

`pnpm preview` and `pnpm test:e2e` do not exist yet; the dev server (`astro dev --port 4337`, own PID, killed afterwards) and a throwaway Playwright script in the scratchpad were used instead.

## Tests added

- `lib/nav.test.ts`: `currentSection` (40 % threshold, strictly above, last wins, missing sections skipped) and `navHref` (in-page on home, `/#id` and `/pl#id` elsewhere).

## Screenshots

`tasks/reports/T-023/screenshots/`: `{1440,1024,768,390}-closed.png`, `*-footer.png`, `390-menu-open.png`, `390-pl-menu-open.png`, `1440-pl-privacy.png`, `390-pl-privacy.png`, `390-scrolled.png`, `760-pl-header.png`, `1440-header-nav-switcher.png`, `showcase-switcher.png`, `1440-skiplink-focus.png`, `1440-forced-colors.png`. The menu is open only at 390 (below 760 it is the only layout where it exists). Page sections are still stubs, so full-page parity is limited to the chrome.

## PL strings for owner review

`nav.ts`: Otwórz menu, Zamknij menu, Zamknij, Mobilna, Napisz do mnie, E-mail, Język. `footer.ts`: Wróć na górę ↑, Prywatność, Ustawienia cookies. (Reused from `common.ts`: Główna, Przejdź do treści, section names, Linki społecznościowe.)

## Assumptions

- Menu opens focused on Close (not the logo, the first focusable); Tab is wrapped by a small keydown handler because the native modal otherwise passes through browser UI.
- `scroll-spy` re-checks on scroll, window resize and body resize (`ResizeObserver`), since late layout shifts move sections without a scroll event.
- Switcher size in the mobile menu comes through `--switcher-size` set by `MobileMenu`, so the component keeps its `locale` + `path` props.
- `aria-label` on the inactive switcher link is the language's own name ("Polski" / "English") as specified, so the visible "PL" is not contained in the accessible name.
- Unscoped attribute selectors for JS-set state use `:global([attr])` on the element (`a:global([aria-current='location'])`) to satisfy `astro/no-unused-css-selector`; compiled output stays scoped.

## Deviations from spec or design

- Desktop nav loses the design's `margin-right: -12px`; that alignment now applies to the switcher (`margin-right: -10px`) as it is the last element.
- The logo's `{}` uses `line-height: 1.55` literally (design value, no token).

## Change Requests

- **CR-1: accepted and applied.** New `components/site/Logo.astro` (header and mobile menu). New tokens in `tokens.css` (nav group, after `--title-max-wide`): `--nav-gap` (`clamp(4px, 1vw, 12px)`), `--nav-pill-y` (6px), `--nav-pill-x` (12px, desktop nav), `--nav-pill-x-compact` (10px, language switcher), used by `DesktopNav` and `LanguageSwitcher`. `docs/design-system.md` §2.9 not updated (shared doc; follow-up for the orchestrator).

## Open issues and follow-ups

- Fresh worktrees need `astro sync` before `pnpm lint` (generated `.astro/` types are absent; `client.ts` lint fails otherwise). Not caused by this task.
- At exactly 760 px with PL labels the nav wraps to two rows (design allows wrapping; see `760-pl-header.png`).
- The cookie banner must hide on `html[data-menu-open]` (T-032); native top-layer already covers it visually while the dialog is open.
- Manual screen-reader smoke (NVDA/VoiceOver) not performed; e2e specs (`e2e/chrome.spec.ts`) not added, T-040 not merged.
