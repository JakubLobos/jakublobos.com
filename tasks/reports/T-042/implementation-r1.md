# T-042: Implementation report, round 1 (phase 1 only)

- **Branch:** `task/T-042-visual`
- **Status claimed:** READY_FOR_REVIEW (phase 1; phase 2 baselines wait for the owner's sign-off)
- **Agent / model:** claude-sonnet-5-5

## Summary

`tools/design/capture-design.mjs --compare` (logic in `tools/design/compare.mjs`) drives the design bundle and the built site
(`pnpm preview`, :8787) through the same states and writes 42 side-by-side PNGs to the git-ignored `e2e/visual/compare/`.
`docs/design/fidelity-report.md` logs the deviations per viewport and the follow-ups. Three CSS-only fixes were made.

## Files changed

| File                                              | Change                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `tools/design/capture-design.mjs`                 | modified: `--compare`, `--site`, `--only` flags                                              |
| `tools/design/compare.mjs`                        | added: comparison driver, masks, side-by-side composer                                       |
| `docs/design/fidelity-report.md`                  | added: deviation log, fixes, follow-up outcomes                                              |
| `apps/web/src/components/decor/PaintDrips.astro`  | modified: top drips absolute under reduced motion (F-1)                                      |
| `apps/web/src/styles/base.css`                    | modified: native scrollbar hidden only >= 760 px with the element defined (F-2, CR approved) |
| `apps/web/src/components/pages/PrivacyPage.astro` | modified: scrolled desktop header gets a background on the privacy page (F-3)                |

`.gitignore` already contained `e2e/visual/compare/`.

## Acceptance criteria

| #    | Criterion                                                   | Status      | Evidence                                                                                                                                                            |
| ---- | ----------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | side-by-side images for every state/viewport; no open MAJOR | done        | 42 PNGs in `e2e/visual/compare/` (1440: 9, 1024: 9, 768: 7, 390: 9, plus banner, typing, modal, errors, loading, success, menu, marquee); report lists 0 open MAJOR |
| AC-2 | owner sign-off                                              | pending     | owner reviews `compare/`                                                                                                                                            |
| AC-3 | visual spec                                                 | not started | phase 2                                                                                                                                                             |

## Validation output

```
$ pnpm preview   (site :8787, API :3000)
$ node tools/design/capture-design.mjs --compare
Side-by-side images written to ...\e2e\visual\compare      (no page errors)
$ pnpm verify    -> EXIT 0  (contracts 153, server 343, web 326 tests passed; build complete)
```

## Tests added

None (task rule: running the tool is the verification).

## Assumptions

- The tool delays `**/api/contact*` by 1.8 s on the built site only, to show the loading state like the prototype's fake delay.
- Contact and guestbook states use the real preview API; the guestbook modal step submits no message (it only opens the modal after a submit), so one real message is sent per run (limit 3 per 10 min).

## Deviations from spec or design

- Not every one of the 42 images was inspected individually (coverage is stated in the report).
- Deep-link CLS could not be reproduced; the remaining check stays with T-043.
- T-028 R1-03 accepted, not fixed (not a one-liner).

## Change Requests

- **CR-1 (T-034):** non-breaking spaces after single-letter Polish words (9 line-end hits on `/pl`, 23 on `/pl/privacy` at 390 px).

## Open issues

- Polish single-letter line ends (MINOR), owned by T-034.
- Phase 2 and owner sign-off outstanding.
- Ports 3000 and 8787 were confirmed free after the last run.
