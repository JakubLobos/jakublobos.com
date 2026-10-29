# T-027: Review, round 1

- **Reviewed:** `task/T-027-projects-skills` @ `3578855` against `main` @ `293d4b6` (merge base `77814ce`; `git merge-tree` against `main` is clean)
- **Reviewer / model:** claude-opus-5-5
- **Verdict:** APPROVED

## Gate results (re-run by reviewer)

| Command                          | Result                                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | PASS already up to date                                                                                                                                          |
| `pnpm verify`                    | PASS exit 0: web typecheck 0 errors; contracts 153, server 314, web 98 tests passed; astro build 0 errors / 0 warnings                                           |
| `pnpm preview`                   | N/A on this branch: the script arrives with T-016, which merged to `main` after this branch's base. Inspected the dev server instead (as the orchestrator asked) |

## Scope check

Files outside _Allowed files_: `apps/web/src/styles/tokens.css` (+9 lines), covered by the orchestrator-accepted CR-1. Unlisted dependencies: none.

## Acceptance criteria (independently verified)

Evidence comes from headless Chrome over CDP against the dev server, capturing `#projects` and `#skills` at 390/768/1024/1440 and comparing them with `docs/design/screenshots/{desktop-1440,tablet-1024,tablet-768,mobile-390}-{projects,skills}.png`.

| #    | Status | Evidence gathered by reviewer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | PASS   | Side-by-sides match at all four widths: row grid, title and description line breaks, org/tags column wrapping under the body at 390 and to the right at ≥768, borders, and type. Skills at 768 and 390 also match, including the `Storybook /` ↵ `A/B Testing` wrap, the 22px row padding and the label-above-items stacking at 390. Measured columns at 1440: number x=292, main x=364, meta x=948 (w 200); skills label x=292, items x=504. CSS values match design-source L174–211 one for one (via tokens). EN copy is verbatim from L650–663. |
| AC-2 | PASS   | Both sections compute `background-color: rgb(247 247 246)` with the 100vmax shadow and clip. The screenshots show no grid lines or drips behind either section; the grid resumes below Skills as in `desktop-1440-skills.png`. `scrollWidth === clientWidth` at 320 (PL), 390, 768, 1024 and 1440 (EN and PL).                                                                                                                                                                                                                                     |
| AC-3 | PASS   | AX tree: `heading` h2 per section → `list` (ol) with 5 `listitem`, each with `heading` h3, two `paragraph`s and `list "Technologies"`; Skills: `DescriptionList` with 5 `term` and `definition` pairs, each `dd` holding a list. The `·` and `/` separators are absent from the AX tree (the `content: … / ''` alt text works). axe-core 4.14 (wcag2a/aa, 21a/aa, 22aa, best-practice) on `/` and `/pl`: 0 violations at 1440 and 390, whole page and scoped to both sections.                                                                     |

## Checklist

Requirements & design PASS · Correctness PASS (static content; long PL titles wrap; 320px is fine) · Architecture PASS · Type safety PASS (no `any`, `Record<Locale, string>` content) · Security & privacy PASS (no sinks, no `style=`, no PII) · Accessibility PASS (no interactive elements, so keyboard and focus are N/A; no motion, so reduced motion is N/A) · Responsive & performance PASS (zero JS) · Tests PASS (none needed; types and `defineMessages` cover the shape) · Process PASS (CR-1 accepted; commits carry `[T-027]` except the merge commit)

## Findings

| ID    | Severity | Location                                     | Problem                                                                                                                                                                                                                                                                                                                                                 | Why (ref)                                   | Expected fix                                                                                                                                                        |
| ----- | -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01 | NIT      | `apps/web/src/styles/tokens.css:201-202`     | `--list-index-col` and `--list-index-gap` use a generic `list-` prefix, but only `Projects.astro:71-72` uses them; the other five tokens in the group are component-prefixed (`--project-*`, `--skill-*`). The `-max` (`--project-desc-max`, matching `--content-max`, `--title-max-*` and T-024's `--intro-max`) and `-basis` suffixes are consistent. | design-system §3 naming consistency         | Rename to `--project-index-col` and `--project-index-gap`, or keep them if the orchestrator intends them as shared list geometry and documents them that way in §3. |
| R1-02 | NIT      | `apps/web/src/content/projects.ts:20`, `:54` | Content notes for the D-02 owner pass: (a) the EN description of project 01 has no final period (verbatim from design L651, unlike the other four), while its PL draft has one; (b) the tags `Requirements · Diagrams` are ordinary words rather than technology names, so leaving them in English on `/pl` may read oddly.                             | D-02; task scope says "tags not translated" | No change now. Pass both to the owner's PL/content review.                                                                                                          |

## Notes for orchestrator

- CR-1 follow-up: `docs/design-system.md` §3 does not list the seven new tokens yet (you own that edit).
- An existing `astro dev` server (PID 9020, port 4330) was already serving this worktree, so I used it instead of starting a second one; I did not stop it because I didn't start it. The headless Chrome instances I started have been terminated.
- The Astro dev toolbar shows in the dev screenshots; it isn't part of the page.
