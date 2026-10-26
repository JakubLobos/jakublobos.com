# T-027: Implementation report, round 1

- **Branch:** `task/T-027-projects-skills` (based on `main` 9d90a36)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Filled the Projects and Skills stubs. Both sections use `SectionHeading` and the same solid-background shell as the design (`background` plus `box-shadow: 0 0 0 100vmax` plus `clip-path: inset(0 -100vmax)`), so the grid and drips are hidden behind them. Content lives in `content/{projects,skills}.ts` (EN verbatim, PL draft, tech names untranslated); headings and the tags label are in `i18n/messages/{projects,skills}.ts`.

## Files changed

| File                                                   | Change                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `apps/web/src/components/sections/Projects.astro`      | modified: `<ol>` of rows (number, h3, description, org, tags list) |
| `apps/web/src/components/sections/Skills.astro`        | modified: `<dl>` of group (`dt`) and items (`dd` > `ul`)           |
| `apps/web/src/content/projects.ts`                     | added: 5 projects, localized title/desc                            |
| `apps/web/src/content/skills.ts`                       | added: 5 groups, localized labels                                  |
| `apps/web/src/i18n/messages/projects.ts` / `skills.ts` | added: eyebrow, title, tags `aria-label`                           |

## Acceptance criteria

| #    | Criterion           | Status          | Evidence                                                                                                                                                                                                                                                                                                                                            |
| ---- | ------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Visual parity       | pass            | `screenshots/projects-skills-{390,768,1024,1440}.png` compared by eye against the design screenshots (row grid, column wrapping, borders, type); no pixel diff. Skills at 1440 (label column at 292, items at 504, row height about 75) and Projects at 768 (title wrap, org column, description line breaks) were compared after the CR and match. |
| AC-2 | Solid full-bleed bg | pass            | Shadow/clip technique as in the design; screenshots show no grid/drips behind the sections and no horizontal scrollbar at 390 (viewed in a 390 px iframe, since headless Chrome has a min window width).                                                                                                                                            |
| AC-3 | Semantics           | partly verified | One `h2` per section (via `SectionHeading`), `h3` per project, `ol`/`ul`/`dl` structure. **axe not run** (Playwright arrives in T-040).                                                                                                                                                                                                             |

## Validation output

```
$ pnpm verify
exit=0  (prettier, eslint, typecheck 0 errors, contracts 153 / server 263 / web 98 tests passed, astro build 6 pages)
```

`pnpm preview` not run (needs the T-016 server topology and adds nothing beyond the dev screenshots for two static sections).

## Tests added

None: no logic was extracted; content shape is enforced by the TypeScript types (`Record<Locale, string>`), and `defineMessages` enforces EN/PL key parity.

## Screenshots

`tasks/reports/T-027/screenshots/projects-skills-{390,768,1024,1440}.png` (full home page; the other sections are still stubs).

## Assumptions

- Tags and skills render as `<ul>` of `<li>` with CSS-generated `·` / `/` separators (`content: '…' / ''` gives them empty alt text, with a plain fallback line). This keeps the visual text from the design while screen readers get a real list. Single-spaced separators plus `word-spacing` reproduce the design's collapsed double spaces.
- The project number is `aria-hidden` (the `ol` already numbers the items).
- Skill group labels use CSS `text-transform: uppercase` as in the design (the eyebrow uses pre-uppercased message data, as `SectionHeading` requires).
- The design has no `Highlight` in these two headings, so none is used.
- No project links exist in the design, so there are none.

## Deviations from spec or design

- The `<ol>` has no `role="list"`: the lint rule `no-redundant-roles` rejects it. Safari/VoiceOver may therefore drop list semantics for the `list-style: none` list. Accepted by the orchestrator.

## Change Requests

- **CR-1: accepted by the orchestrator and applied.** The layout measures are now tokens in `apps/web/src/styles/tokens.css` (one group, "Projects and Skills row geometry (T-027)"); the local custom-property blocks are removed from both components. `docs/design-system.md` is not edited (the orchestrator documents the tokens). Tokens added:
  - `--list-index-col: clamp(32px, 6vw, 48px)`
  - `--list-index-gap: clamp(12px, 2.4vw, 24px)`
  - `--project-main-basis: 340px`
  - `--project-meta-basis: 200px`
  - `--project-desc-max: 560px`
  - `--skill-label-basis: 180px`
  - `--skill-items-basis: 280px`

  No existing token matched any of them (no `--measure-*` tokens on main).

## Open issues and follow-ups

- PL copy (project titles/descriptions, group labels, headings) is a draft for owner review (D-02). Tech tags and skill items are intentionally English.
- Local note: `astro sync` was needed before `pnpm verify` lint passed in the fresh worktree (`import.meta.env` typing in `lib/api/client.ts`); unrelated to this task.
