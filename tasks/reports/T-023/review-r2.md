# T-023 review, round 2

- **Reviewer:** orchestrator (Opus), re-review of round 1 findings
- **Verdict:** APPROVED

| Finding                                         | Status                                                                                                                                                                                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01 MAJOR switcher name mismatch (WCAG 2.5.3) | Fixed: visible "PL"/"EN" plus a visually hidden " – Polski"/" – English"; no `aria-label`, so the accessible name starts with the visible text. Implementer re-ran axe 4.14: 0 violations on `/`, `/pl`, `/privacy` (1440) and `/`, `/pl` (390, menu open and closed). |
| R1-02 MINOR focus lost on resize close          | Fixed: focus falls back to the visible logo link when the Menu button is hidden (`checkVisibility()`); Esc still returns to Menu.                                                                                                                                      |
| R1-03 NIT `querySelector('header')`             | Fixed: `data-site-header` hook.                                                                                                                                                                                                                                        |
| R1-04 NIT raw line-height                       | Fixed: `--leading-logo-mark` token.                                                                                                                                                                                                                                    |

The round 1 report's axe claim was wrong and is acknowledged in `implementation-r2.md`. Nav and logo tokens are documented in `design-system.md` §2.9. Gate C: `pnpm verify` on the squash-merged tree.
