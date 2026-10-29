# T-088 implementation report (round 1)

## Summary

- UI: `Projects.astro` link marker and the footer "Back to top" now use `ArrowIcon.astro` (direction prop) (inline SVG, `aria-hidden`, `currentColor`, `--icon-arrow` token, spacing by margin so the underline has no odd gap). The glyphs were removed from `footer.ts` (EN and PL).
- Repo text: status markers in docs, templates and past reports replaced mechanically (PASS / FAIL / WARN). The two-way arrow in four docs replaced by words. The `✓` / `✗` in `docs/architecture.md` and `docs/guestbook-moderation.md` diagrams replaced by words (`never import each other`, `OK`).
- Rule: `AGENTS.md` rule 8 (later rules renumbered; `docs/design/fidelity-report.md` reference updated), `CLAUDE.md`, `docs/design-system.md` section 3a (with the approved deviation), both briefs, D-37 in `docs/decisions/open-questions.md`.
- Guard: `tools/check-no-emoji.mjs`, run as `pnpm check:emoji` first after `format:check` in `pnpm verify`.

## Scan (tracked text files, `Extended_Pictographic` + `Emoji_Presentation` + U+FE0F; (c) (r) (tm) excluded as ordinary text)

Before (first scan, (c)/(tm) excluded): apps/server 48, apps/web 1, docs 35 (agent-workflow 3, agents 22, implementation-plan 10), tasks specs 2, tasks/reports 581. The two UI arrow glyphs were removed before that scan.
After: apps/server 48, apps/web 1, tasks/reports 15. Everything left is an exception below.

## Exceptions kept

- `apps/server/src/domain/guestbook/quality-rules.ts` and `quality-rules.test.ts`
- `apps/server/test/fixtures/guestbook/legit-messages.en.txt`, `legit-messages.pl.txt`, `weird-messages.txt`
- `apps/web/src/lib/text-diff.test.ts`
- Reports quoting those strings as data: `tasks/reports/T-010/review-r2.md`, `tasks/reports/T-013/implementation-r2.md`, `tasks/reports/T-013/review-r1.md` (only their status markers were replaced)

## Evidence

- `pnpm verify`: green (budgets OK; `check:emoji` prints `check-no-emoji: ok`).
- Preview on port 4420, Playwright + axe on `#projects` and `footer` at 1440 and 390: 0 violations, no horizontal overflow, 6 SVG icons found.
- Screenshots: `screenshots/projects-links-1440.png`, `screenshots/footer-1440.png`, `screenshots/footer-390.png`. The arrows sit on the text baseline at the glyph's former size.
- No `e2e/` assertions referenced "Back to top" or the glyphs (grep).

## Notes

- `design-source.html` still contains the glyph; it is a reference artifact and was not edited.
- The `docs/design/screenshots/*.png` and `tasks/reports/**/screenshots` binaries were not touched.
