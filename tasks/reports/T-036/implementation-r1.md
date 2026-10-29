# T-036: Implementation report, round 1

- **Branch:** `task/T-036-guestbook-status`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** Claude Sonnet 5.5

## Summary

After sending, the guestbook dialog now polls `GET /api/guestbook/submissions/:clientRequestId` and shows checking, approved, rejected (one of four general reasons), superseded, or taking longer. A new text-free `guestbook_submission_outcomes` table lets the endpoint answer for rows that are deleted by design (rejected, superseded) and for silent drops. Approval refetches the "last visitor said" quote. Design and decisions: ADR-0017, D-29.

## Files changed

| File                                                                                                                  | Change                                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/contracts/src/{constants,schemas,types}.ts`                                                                 | modified: statuses, reasons, response schema and types                                       |
| `apps/server/src/domain/guestbook/rejection-reason.ts` (+ test)                                                       | added: pure `generalReason()` mapping                                                        |
| `apps/server/src/domain/guestbook/{guestbook.service,review-worker,review-pipeline,blocked-terms,repository.port}.ts` | modified: record outcomes for drops and rejects, `submissionStatus()`, meme-term distinction |
| `apps/server/src/infra/db/migrations/0002_submission_outcomes.sql`                                                    | added: outcome table                                                                         |
| `apps/server/src/infra/db/guestbook.repository.ts` (+ test)                                                           | modified: superseded/rejected outcomes, `findSubmissionStatus`, pruning and cap              |
| `apps/server/src/http/routes/guestbook.routes.ts` (+ test), `apps/server/test/helpers/build-test-app.ts`              | modified: the new route, limiter and helper                                                  |
| `apps/web/src/lib/guestbook-status.ts` (+ test)                                                                       | added: poll schedule, status step, stored-submission parsing, status copy parsing            |
| `apps/web/src/lib/api/{client,guestbook}.ts`, `lib/guestbook-form.ts` (+ test)                                        | modified: `not_found` kind, `getSubmissionStatus`, `clientRequestId` in the sent outcome     |
| `apps/web/src/scripts/{guestbook-form,last-visitor}.ts`                                                               | modified: polling, state rendering, quote refresh                                            |
| `apps/web/src/components/guestbook/GuestbookModal.astro`, `styles/keyframes.css`                                      | modified: states, brush progress, live region                                                |
| `apps/web/src/i18n/messages/guestbook.ts`                                                                             | modified: EN + PL status copy                                                                |
| `e2e/guestbook.spec.ts`                                                                                               | modified: new modal flows, old uniform-modal assertions removed                              |
| `docs/**`, `tasks/T-036-*`                                                                                            | ADR-0017, api, moderation, security (T5a), D-29, task spec                                   |

## Acceptance criteria

| #    | Criterion                                              | Status                                                                        | Evidence                                                                                                        |
| ---- | ------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| AC-1 | Endpoint statuses, 404, 400, no-store, 429, no leakage | ✅                                                                            | `guestbook.routes.test.ts` "GET /api/guestbook/submissions/:clientRequestId" (4 tests)                          |
| AC-2 | Reasons mapped to four labels                          | ✅                                                                            | `rejection-reason.test.ts` (all suitability reasons covered)                                                    |
| AC-3 | Silent drops: same 202, text-free row                  | ✅                                                                            | existing AC-6 byte-identity test still passes; routes test checks drop statuses; repository test checks columns |
| AC-4 | Modal states, quote refresh, quiet polling             | ✅                                                                            | e2e "the modal reports each outcome..." and "ends in the taking longer state"                                   |
| AC-5 | Poll schedule, hidden pause, resume                    | ✅ (schedule, resume parsing unit-tested; hidden pause not covered by a test) | `guestbook-status.test.ts`                                                                                      |
| AC-6 | Accessibility                                          | ✅                                                                            | axe on `#guestbook-modal` in checking and taking-longer states; polite live region asserted                     |

## Validation output

```
$ pnpm verify   -> exit 0
contracts: 153 passed · server: 412 passed (33 files) · web: 338 passed (29 files)
astro check: 0 errors · build ok · Budgets OK (critical JS 14.2 KB / 35.0 KB)
$ E2E_API_PORT=3100 E2E_SITE_PORT=8887 pnpm test:e2e --grep @guestbook --project=chromium-desktop
10 passed (21.7s)
```

## Tests added

- `rejection-reason.test.ts`: every internal outcome to its general reason; totality over suitability reasons.
- `guestbook.routes.test.ts`: each status, superseded, silent drops, 404, 400, no text or internals in the body, 30/min limit.
- `guestbook.repository.test.ts`: outcomes by token, no text columns, pruning with retention, 1000-row cap, migration list.
- `guestbook-status.test.ts`: delays 1.5/2/3/5 s, 60 s budget, step mapping, stored-submission freshness and tampering.
- `e2e/guestbook.spec.ts`: checking modal (tint, live region, axe), 404 to "taking longer", real server: `[flag]` to inappropriate, `[unsuitable]` to off_topic, `[fail]` then another visitor's note to superseded, approval refreshes the quote.

## Assumptions

- Response uses the usual `{ data: ... }` envelope.
- A reload within 2 minutes resumes polling quietly (dialog stays closed, the text is not stored).
- A submission superseded by the visitor's own newer submission in the same tab stops the older watch.
- Duplicate text under a new token writes no outcome, so its poll gets 404 and shows "taking longer".
- `recently_rejected` drops report `inappropriate` (the original reason is not kept with the hash); honeypot reports `off_topic`.
- 404 and the 60 s timeout share the "taking longer" copy.

## Deviations from spec or design

- A new dialog look (brush progress, state texts) is a design addition recorded as D-29.

## Open issues and follow-ups

- PL strings are drafts for owner review (below).
- The "pause while hidden" behaviour is implemented but not covered by a test.
- `e2e/nojs.spec.ts` fails on main until PR #8; not touched.
- Not run: other e2e projects (mobile, firefox, webkit).

### PL strings for owner review

- CHECKING: „SPRAWDZAM”, „Sprawdzam Twój wpis…”, „Zwykle zajmuje to kilka sekund.”
- Approved: „JUŻ NA STRONIE”, „Twój wpis jest już na stronie!”, „Wita teraz kolejnego gościa.”
- Rejected: „NIEOPUBLIKOWANY”, „Oj… Twój wpis nie przeszedł weryfikacji.” with „Nie pasuje do charakteru tej strony.” / „Wygląda na mema albo nie jest o tej stronie.” / „Nie podpisuj się jako autor strony.” / „Pomiń dane osobowe.”
- Superseded: „ZASTĄPIONY”, „Ktoś był odrobinę szybszy”, „Zanim Twój wpis został sprawdzony, pojawił się nowszy, a wygrywa najnowszy. Spróbuj jeszcze raz później!”
- Taking longer: „WCIĄŻ SPRAWDZAM”, „To trwa dłużej niż zwykle.”, „Jeśli Twój wpis zostanie zatwierdzony, pojawi się na stronie.”
