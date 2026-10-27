# T-023: Implementation report, round 2

- **Branch:** `task/T-023-site-chrome` (round 2 commit on top of the `main` merge)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: `aria-label` removed from the inactive switcher link; the name is now the visible text plus a `.visually-hidden` " – Polski" / " – English" (`LanguageSwitcher.astro`). Measured names: "PL – Polski", "EN – English".                                                         |
| R1-02   | fixed: on close, focus goes to the Menu button if `trigger.checkVisibility()`, else to the first link in `[data-site-header]` (the logo). Measured: menu open at 390, resize to 800, focus on `a.logo`, menu closed, `data-menu-open` cleared. Esc still returns focus to the button. |
| R1-03   | fixed: `<header data-site-header>`; the scrolled-state script selects by that attribute.                                                                                                                                                                                              |
| R1-04   | fixed: new token `--leading-logo-mark: 1.55` (CR-1 group in `tokens.css`), used by `Logo.astro`.                                                                                                                                                                                      |
| T-024   | already satisfied: `Footer.astro` has `position: relative; z-index: var(--z-content)` (hero drips sit behind it).                                                                                                                                                                     |

## Axe (axe-core 4.14.0, all rules, throwaway Playwright script with system Chrome, own dev server stopped afterwards)

0 violations on: `/` 1440, `/pl` 1440, `/privacy` 1440, `/` 390 closed, `/` 390 menu open, `/pl` 390 closed, `/pl` 390 menu open.
Round 1's "0 violations" claim was wrong for the switcher: the reviewer's `label-content-name-mismatch` finding was valid and I did not find out why my round 1 run missed it. This round the same check was run on every page above (and the link names were read back), after the fix.

## Validation

`pnpm verify` exit 0: contracts 153, server 314, web 191 tests; typecheck 0 errors; build complete.
