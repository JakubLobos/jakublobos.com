# T-027: Projects and Skills sections

|                          |                           |
| ------------------------ | ------------------------- |
| **Wave**                 | 4                         |
| **Depends on**           | T-021, T-022              |
| **Blocked by decisions** | D-02 (PL content: draft)  |
| **Parallel with**        | T-023…T-026, T-028, T-031 |
| **Size**                 | S                         |
| **Requirements**         | FR-23, FR-24, NFR-01      |

## Objective

Implement the two static content sections with exact layout fidelity, including the solid full-bleed background that hides the grid and drips.

## References

- `docs/design-analysis.md` §2 (background layering), §4.9, §4.10
- `docs/design/extracted/design-source.html` L174–211, L650–663
- Screenshots: `desktop-1440-projects.png`, `desktop-1440-skills.png`, `tablet-1024-projects.png`, `mobile-390-projects.png`, `mobile-390-skills.png`

## Scope

- `content/projects.ts` (5 projects: n, title, desc, org, tags; EN verbatim, PL draft; tags not translated).
- `content/skills.ts` (5 groups: label + items; group labels translated, items mostly not).
- `sections/Projects.astro`: `SectionHeading` (02, title max-width 520) and a semantic list (`<ol>`) of rows per §4.9.
- `sections/Skills.astro`: `SectionHeading` (03) and a `<dl>` (group → items) styled per §4.10. Items keep the `  /  ` separators visually; use `aria-hidden` separators with a proper list for screen readers, or keep the text if that reads naturally (document the choice).
- `messages/projects.ts`, `messages/skills.ts`.

## Allowed files

`apps/web/src/components/sections/{Projects,Skills}.astro`, `apps/web/src/content/{projects,skills}.ts`, `apps/web/src/i18n/messages/{projects,skills}.ts`.

## Acceptance criteria

- **AC-1** Visual parity with the referenced screenshots at 1440, 1024, and 390 (row grid, wrapping of the org/tags column, borders, spacing, type).
- **AC-2** The grid background and drips are hidden behind both sections exactly as in the design (`box-shadow` 100vmax + `clip-path` technique), with no horizontal overflow.
- **AC-3** Semantic structure: one `h2` per section, `h3` per project, a list structure announced correctly (axe clean).

## Validation

```
pnpm verify
pnpm preview
```

## Definition of done

Standard DoD.
