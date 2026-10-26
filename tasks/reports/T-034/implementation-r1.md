# T-034: Implementation report, round 1

- **Branch:** `task/T-034-pl-copy`
- **Status claimed:** READY_FOR_REVIEW (AC-4 is an owner gate and stays open)
- **Agent / model:** Sonnet 5.5

## Summary

Added Polish typography (non-breaking spaces) applied centrally: inside `defineMessages` for the `pl`
tree, inside `privacy()` for the policy tree, and where PL content is exported from the content
modules. Added `tools/i18n/export-copy.ts`, which writes `docs/content/pl-copy-review.md` (333 string
pairs, 20 areas). Finished the PL copy fixes started earlier and a terminology pass.

## Files changed

| File                                                           | Change                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `apps/web/src/lib/pl-typography.ts` (+ `.test.ts`)             | added: `polishTypography`, `polishDeep` (deep map; function results wrapped)          |
| `apps/web/src/i18n/t.ts`                                       | modified (approved CR): `defineMessages` typesets the `pl` tree once; types unchanged |
| `apps/web/src/i18n/messages/privacy.ts`                        | modified: `privacy()` typesets PL, skipping `id`/`href`; PL wording fixes             |
| `apps/web/src/content/{experience,projects,skills,marquee}.ts` | modified: PL exports typeset at the module boundary; PL wording fixes (experience)    |
| `apps/web/src/i18n/messages/{contact,cookies,guestbook}.ts`    | modified: PL fixes; EN `cookies.text` and `contact.noScript` changed (approved)       |
| `tools/i18n/export-copy.ts`                                    | added                                                                                 |
| `docs/content/pl-copy-review.md`                               | added (generated), "Status: awaiting owner review"                                    |
| `.prettierignore`                                              | modified: ignore the generated review doc (Prettier would re-wrap its tables)         |

## Acceptance criteria

| #    | Criterion                    | Status | Evidence                                                                                          |
| ---- | ---------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| AC-1 | 100 % of keys, script fails  | OK     | script scans `i18n/messages` and `content`, fails on an unregistered module or EN/PL key mismatch |
| AC-2 | No PL == EN except whitelist | OK     | script output: 40 identical, 0 not whitelisted (proper nouns, tech names, emails, cookie names)   |
| AC-3 | NBSP rules unit-tested       | OK     | `pl-typography.test.ts`; screenshot spot-check left to the orchestrator as instructed             |
| AC-4 | Owner sign-off               | OPEN   | doc header says "awaiting owner review"; sign-off table empty                                     |

## Validation output

```
$ node tools/i18n/export-copy.ts
Wrote .../docs/content/pl-copy-review.md: 333 strings, 20 areas.
PL equals EN for 40 strings (0 not whitelisted).
$ pnpm verify   -> format, lint, typecheck, test, build all green (web build: 0 errors, 6 pages)
$ pnpm -F @portfolio/web exec vitest run -> 28 files passed, 332 tests (before adding the polishDeep case)
```

Built `pl.html` and `pl/privacy.html` checked: no NBSP in `href`, `src`, `id`, or the JSON-LD block. NBSP
appears in `<meta content>` descriptions and `data-messages` JSON, which are prose.

## Tests added

- `pl-typography.test.ts`: single-letter words, no-touch cases, number+unit, abbreviations, idempotence,
  and `polishDeep` (strings, arrays, function results, skipped keys).

## Assumptions

- Terminology: "wpis" is the stored guestbook entry; "ślad" is kept only for the playful CTA
  ("Zostaw ślad", "Dzięki za ślad!"). The rate-limit message was changed from "śladów" to "wpisów".
- "Stażysta" replaces "praktykant"; "Zaimplementowałem" replaces "Stworzyłem" in Peryskop bullets.
- Quotes are „…” throughout; no formal address (Pan/Pani) found.

## Deviations from spec or design

- EN `cookies.text` ("Nothing is sold or used for advertising") and `contact.noScript` ("Email me instead.")
  changed, approved by the orchestrator as a T-030/T-032 follow-up.
- `.prettierignore` edited (not in Allowed files) so the generated doc does not fail `format:check`.

## Change Requests

- **CR-1 (approved):** `apps/web/src/i18n/t.ts`, apply `polishDeep` to the `pl` tree.

## Open issues and follow-ups

- AC-4 owner review; corrections go in the doc's "Owner correction" column.
- PL typography is not applied to `profile.ts` (used by JSON-LD and links); `role`/`languages` have no triggers.
- Privacy placeholders `[WŁAŚCICIEL: …]` remain owner-supplied (T-033).
