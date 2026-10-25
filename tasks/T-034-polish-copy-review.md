# T-034: Polish copy consolidation and owner review pack

|                          |                                                           |
| ------------------------ | --------------------------------------------------------- |
| **Wave**                 | 6                                                         |
| **Depends on**           | T-021, T-023…T-030, T-032, T-033 (all copy-bearing tasks) |
| **Blocked by decisions** | D-02 (the owner's review is the purpose of this task)     |
| **Parallel with**        | T-041, T-042, T-043, T-050                                |
| **Size**                 | M                                                         |
| **Requirements**         | FR-05                                                     |

## Objective

Make the Polish site publication-ready. Produce one review document of every EN/PL string pair for the owner, apply the owner's corrections, and enforce Polish typographic conventions.

## References

- `docs/architecture.md` §6
- All `apps/web/src/i18n/messages/*.ts` and `apps/web/src/content/*.ts`

## Scope

- `tools/i18n/export-copy.ts`: a Node script (run with `node`, type stripping) that imports every message and content module and writes `docs/content/pl-copy-review.md`, a table of key, EN, and PL with an empty "Owner correction" column, grouped by area.
- Polish typography helper `lib/pl-typography.ts` (pure): non-breaking spaces after single-letter words (`a i o u w z` and uppercase variants) and between numbers and units. Apply it at render time to PL strings, centrally in `t()` for the `pl` locale (shared-surface Change Request to T-021's `t.ts`) or per component, whichever the orchestrator approves.
- After owner review: apply corrections to the modules, regenerate the review doc, and mark it approved with the date.
- Consistency pass: terminology (for example "wpis" vs "ślad" for "mark"), formal vs informal address (decide with the owner; default informal "Ty", matching the playful tone), and the quote style „…”.

## Allowed files

`tools/i18n/**`, `docs/content/pl-copy-review.md`, `apps/web/src/lib/pl-typography.ts` (+ test), PL values in `apps/web/src/i18n/messages/*.ts` and `apps/web/src/content/*.ts` (values only; keys and EN unchanged), plus `t.ts` via an approved Change Request.

## Acceptance criteria

- **AC-1** The review doc lists 100 % of keys (the script fails if a module isn't covered).
- **AC-2** No PL string equals its EN counterpart except whitelisted proper nouns and tech names (the script reports them).
- **AC-3** NBSP rules are applied and unit-tested; no single-letter word ends a line in PL at 390 px (spot-check screenshots).
- **AC-4** Owner sign-off recorded in the doc (date + "approved"). Until then the task stays `IN_REVIEW` (owner gate).

## Validation

```
pnpm verify
node tools/i18n/export-copy.ts
```

## Definition of done

Standard DoD plus owner approval recorded.
