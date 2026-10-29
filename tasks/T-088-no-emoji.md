# T-088: No emoji

- **Wave:** 8 (go-live) · **Size:** M · **Depends on:** T-087
- **Owner request (2026-10-29, D-37):** remove all emoji from the project. Emoji are not allowed as icons. Record the rule in the agent instructions.
  - UI: the footer "Back to top" and the project link marker become inline SVG icons (`ArrowIcon`): `aria-hidden`, `currentColor`, sized with `--icon-arrow`.
  - Repo text: status markers become `PASS` / `FAIL` / `WARN` / `N/A` in docs, templates and past reports.
  - Exception: test data that exercises emoji in user input (`quality-rules.ts` and its test, guestbook fixtures, `text-diff.test.ts`, and reports quoting those strings).
  - Rule added to `AGENTS.md` (rule 8), `CLAUDE.md`, `docs/design-system.md` section 3a and both agent briefs; guard `tools/check-no-emoji.mjs` runs in `pnpm verify`.
- **Allowed files:** `AGENTS.md`, `CLAUDE.md`, `docs/**`, `tasks/**`, `apps/web/src/components/**`, `apps/web/src/i18n/messages/footer.ts`, `apps/web/src/styles/tokens.css`, `package.json`, `tools/check-no-emoji.mjs`.
- **Validation:** `pnpm verify`; Projects links and footer screenshots at 390 and 1440, axe clean on `#projects` and the footer.
