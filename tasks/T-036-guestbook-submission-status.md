# T-036: Live guestbook submission status

|                          |                                         |
| ------------------------ | --------------------------------------- |
| **Wave**                 | 5 (post-launch addition)                |
| **Depends on**           | T-010, T-012, T-014, T-029 (all merged) |
| **Blocked by decisions** | none (owner approved, ADR-0017, D-29)   |
| **Parallel with**        | none                                    |
| **Size**                 | M                                       |
| **Requirements**         | FR-25, FR-26, FR-27, FR-41, NFR-05      |

## Objective

After a visitor submits, the modal shows live review progress and the outcome instead of the uniform "in review" message: checking, then approved, rejected (very general reason), superseded, or taking longer. On approval the "last visitor said" quote refreshes at once.

## References

- `docs/guestbook-moderation.md` §2, §4, §5, §7, §10 · `docs/api.md` · `docs/security.md` T5
- `docs/decisions/0005-openai-moderation-with-local-rules.md` (amended), `0017-guestbook-submission-status.md`

## Scope

- Contracts: response type and zod schema (`GuestbookSubmissionStatusResponse`), status and reason constants.
- Server: `GET /api/guestbook/submissions/:clientRequestId` (UUID validated, 404 unknown, `no-store`, 30 / min limiter); `domain` pure `generalReason()` mapping; migration `0002` with a text-free `guestbook_submission_outcomes` table (24 h retention, 1000-row cap); superseded, rejected and silently dropped submissions write an outcome.
- Web: pure poll schedule and status helpers (`lib/guestbook-status.ts`), `getSubmissionStatus()`, dialog states (checking, approved, rejected with reason, superseded, taking longer), CSS-only brush progress, polite live region, `sessionStorage` resume (under 2 minutes), quote refresh on approval, EN + PL copy.
- Docs: ADR-0017, `api.md`, `guestbook-moderation.md`, `security.md`, `open-questions.md` (D-29).

## Out of scope

- Detailed rejection reasons; push transports; changing the POST response.

## Allowed files

- `packages/contracts/src/**`, `apps/server/src/**`, `apps/server/test/helpers/**`, `apps/web/src/{components/guestbook,i18n/messages/guestbook.ts,lib,scripts,styles/keyframes.css}`, `e2e/guestbook.spec.ts`, the docs above, `tasks/T-036-*`, `tasks/reports/T-036/**`.

## Acceptance criteria

- **AC-1** The endpoint returns each of the four statuses, 404 for unknown tokens, 400 for non-UUIDs, `no-store`, and 429 beyond 30 / min; the body never contains text or internal reasons.
- **AC-2** Every internal rejection maps to one of four general reasons (unit test over all suitability reasons).
- **AC-3** Silently dropped submissions answer the same 202 and leave only a text-free outcome row.
- **AC-4** The modal follows checking -> approved / rejected / superseded / taking longer; approval refreshes the quote; closing the modal keeps polling quietly.
- **AC-5** Polling follows 1.5 / 2 / 3 / 5 s for at most 60 s, pauses while hidden, stops on terminal status or 404; a reload resumes only within 2 minutes.
- **AC-6** Accessible: polite live region, reduced-motion static state, forced colors, axe clean.

## Tests required

Domain mapping, routes, repository outcomes, poll schedule and stored-submission parsing; e2e `@guestbook` updated for the new modal.
