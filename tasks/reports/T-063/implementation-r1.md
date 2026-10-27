# T-063: Implementation report, round 1

- **Branch:** `task/T-063-stable-form-messages`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Three scripts cleared a message at the start of an async action and refilled it afterwards. The collapsed message (`:empty { display: none }`) reflowed everything below it. Each now keeps the previous message while the request runs and replaces it once, when the outcome arrives. No new mechanism, CSS, strings or tests (no new pure logic).

## Files changed

| File                                     | Change                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/scripts/guestbook-form.ts` | modified: `clearError()` moved from before the request to right after the outcome (not for `ignored`, so a click while busy no longer wipes the error) |
| `apps/web/src/scripts/phone-reveal.ts`   | modified: no clearing on start; the message is cleared on success, rewritten on failure                                                                |
| `apps/web/src/scripts/contact-form.ts`   | modified: the error status is not replaced by "Sending…" while a retry runs                                                                            |
| `tasks/T-063-stable-form-messages.md`    | added: spec (prettier-formatted so `format:check` passes)                                                                                              |

## Root cause per spot

- Guestbook: `submitMessage()` cleared `[data-error]` before awaiting; the empty `<p>` is `display: none`, so the actions row jumped up, then back.
- Phone: `setBusy(true)` cleared `[data-failed]` (`.failed:empty { display: none }`); the rows below moved up, then back.
- Contact: the status text went failure to "Sending…" to failure. The failure text is long enough to wrap onto its own line under the button; "Sending…" fits beside it. The actions row changed height (92.8 to 56 px) and the privacy notice below jumped about 37 px.

## Audit table

| Candidate                                                                        | Finding                                                                                                                                                                        | Changed |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `guestbook-form.ts` / `GuestbookForm.astro` `[data-error]`                       | Cleared before request, collapses (`.error:empty`). Real bug.                                                                                                                  | yes     |
| `phone-reveal.ts` / `ContactDetails.astro` `[data-failed]`                       | Cleared on busy, collapses (`.failed:empty`). Real bug.                                                                                                                        | yes     |
| `contact-form.ts` `setStatus` / `ContactForm.astro` `[data-status]`              | Failure to "Sending…" to failure reflowed the row (wrap vs no wrap). Real bug, not on the button but on everything below it.                                                   | yes     |
| `contact-form.ts` field errors (`FormField.astro` `[data-error]`)                | `renderErrors` is not cleared at request start; it rewrites only when text differs; server field errors are cleared only on `send()` start together with revalidation. Stable. | no      |
| `GuestbookModal.astro` status texts                                              | `min-block-size: 2lh` (title) and `3lh` (copy) are reserved; texts swap inside the card. Stable.                                                                               | no      |
| Guestbook `[data-announce]`, `[data-counter]`                                    | visually hidden / fixed-width counter, no layout effect.                                                                                                                       | no      |
| Phone `[data-announce]`, `[data-widget]`                                         | visually hidden / `.widget:empty` only toggles while the challenge renders (Turnstile, interaction-only), not a message.                                                       | no      |
| Other `components/` + `scripts/` with `aria-live` / `data-error` / `data-status` | Only the files above (plus `dev/showcase.astro`, dev-only). Nothing else found.                                                                                                | no      |

## Approach and announcements

- The outcome handlers replace the text once; in the guestbook this is `clearError()` then `showError()` in the same synchronous step, so no frame is painted between them.
- Contact: `setPhase('sending')` skips `setStatus` when the status already has the error tone. The outcome's `setPhase('idle')` clears it and `setStatus(..., 'error')` sets it again, in the same task.
- Repeated identical failures are announced by reusing the regions that already exist (`role="alert"` on the guestbook error, `aria-live="polite"` on the contact status and the phone `[data-failed]`). Replacing the text node inserts a new node, which is what makes a live region speak. This is the opposite of contact `renderErrors`, which deliberately avoids rewriting identical field text because that is not a new event; a repeated submit failure is one.
- Checked in the browser with a `MutationObserver` on each region (throwaway script), second failure in a row:
  - guestbook: `old text => ""` then `"" => old text`
  - contact: `old text => ""` then `"" => old text`
  - phone: `old text => old text` (the single `textContent =` replacement removes one node and adds one)

  Each is a fresh node insertion on the repeat. Not tested with a real screen reader.

## Bounding-box numbers (layout y in px, `offsetTop` chain, so the button's busy `translateY` sink is excluded)

The second click of the submit button, stubbed API with 429 / 403 after 800 ms. Sampled before the click, 300 ms in ("during"), and after the response. Mouse parked away from the button.

| Viewport | Element tracked                      | Before fix (before / during / after)                 | After fix (before / during / after) |
| -------- | ------------------------------------ | ---------------------------------------------------- | ----------------------------------- |
| 390      | guestbook submit button              | 5563 / 5509 / 5563                                   | 5563 / 5563 / 5563                  |
| 390      | guestbook row below the message      | 5503 / 5449 / 5503                                   | 5503 / 5503 / 5503                  |
| 390      | contact submit button                | 6579 / 6579 / 6579                                   | 6579 / 6579 / 6579                  |
| 390      | contact `.notice` (below the status) | not measured at 390 px                               | 6695 / 6695 / 6695                  |
| 390      | phone, next row (GitHub `dt`)        | 6114 / 6095 / 6114                                   | 6114 / 6114 / 6114                  |
| 1440     | guestbook submit button              | 5823 / 5790 / 5823                                   | 5823 / 5823 / 5823                  |
| 1440     | contact submit button                | 6453 / 6453 / 6453                                   | 6453 / 6453 / 6453                  |
| 1440     | contact `.notice`                    | 6536.6 / 6499.8 / 6536.6 (viewport probe, same rows) | 6570 / 6570 / 6570                  |
| 1440     | phone, next row (GitHub `dt`)        | 6445 / 6426 / 6445                                   | 6445 / 6445 / 6445                  |

The "before fix" column was produced by temporarily checking out the unchanged scripts and rebuilding. The contact button itself never moved (it is the first flex line); the jump was in the row height and everything below.

## Acceptance criteria

| #   | Criterion                                   | Status | Evidence                                                    |
| --- | ------------------------------------------- | ------ | ----------------------------------------------------------- |
| 1   | Guestbook button and rows below do not move | met    | table above, 0 px at 390 and 1440                           |
| 2   | Phone and contact behave the same           | met    | table above; contact and phone were real bugs and are fixed |
| 3   | Repeated identical failure still announced  | met    | MutationObserver output above (no real screen reader)       |
| 4   | `pnpm verify` green                         | met    | see below                                                   |

## Commands run

```
pnpm install --frozen-lockfile          # ok
pnpm verify                             # format:check, lint, typecheck, test, build, check:budgets: all passed, ended with "Budgets OK."
pnpm --filter @portfolio/web build + astro preview --port 4403   # throwaway Playwright measurements (not committed); PID 37772 killed afterwards
```

`pnpm test:e2e` was not run (per instructions). `apps/web/e2e/` does not exist in this checkout, so no spec was touched or needed updating.

## Assumptions / notes

- The first failure still makes the message appear, which moves what is below it once. That is a new message appearing, not a clear and re-show, and no space is reserved (design fidelity for forms that normally have none).
- While a retry runs after a contact failure, no "Sending…" status is announced; the button keeps `aria-busy` and shows its "Sending…" face. The first send (no prior error) still shows and announces "Sending…".
- The spec file was formatted with prettier only (content unchanged) so `format:check` passes.

## Risks

- Contact: leaving the error visible during a retry means the visible status reads as a failure while the button says "Sending…" for about a request. Judged better than the reflow.

## Open issues

None.
