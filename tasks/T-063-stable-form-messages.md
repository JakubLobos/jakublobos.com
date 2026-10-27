# T-063: Stable form messages (no layout jump on resubmit)

- **Wave:** 7 (polish) · **Size:** S · **Depends on:** T-029, T-030, T-031, T-036 (done)
- **Owner report (2026-10-27):** in the guestbook, when "Zostaw ślad" / "Leave a mark" is clicked while the rate-limit message ("Zostawiono już kilka wpisów. Spróbuj ponownie za kilka minut.") is shown, the button jumps up and down: the message disappears for the duration of the request and then the same message appears again. Fix it, and fix the same class of bug everywhere else on the site.

## Root cause (guestbook, verified by the orchestrator)

`submitMessage()` in `apps/web/src/scripts/guestbook-form.ts` calls `clearError()` before awaiting the request. `GuestbookForm.astro` has `.error:empty { display: none }`, so the paragraph collapses and everything below it (the actions row with the button) shifts up, then shifts back when the outcome re-writes the message.

## Required behaviour

1. **No layout shift caused by a message being cleared and re-shown across a submit.** While a request is in flight, the previous message stays where it is (the button already shows its busy "Sending…" look). When the outcome arrives, the message area is updated **once**: replaced by the new message, or cleared if the outcome is success / no error. Typing in the field may still clear the error immediately (existing behaviour; that is user-driven, not a jump).
2. **Screen readers:** a repeated identical failure must still be perceivable. Pick the simplest correct approach and justify it in a one-line _why_ comment. For example, the contact form deliberately skips rewriting identical text (`contact-form.ts` `renderErrors`). For a _repeated submit failure_, though, the visitor needs to hear that the retry also failed. Reuse an existing live region or the existing alert. Don't invent a new mechanism unless nothing existing fits.
3. **Audit the rest of the site** for the same pattern: a message element hidden with `:empty`/`hidden` that a script clears at the start of an async action and refills afterwards, or any status text whose change makes neighbouring controls move. Known candidates to check:
   - `scripts/phone-reveal.ts` (`failed.textContent = ''` before verifying; `.failed:empty { display: none }` in `ContactDetails.astro`).
   - `scripts/contact-form.ts` `setStatus` (status text goes failure → "Sending…" → failure; check whether its length or wrapping moves the button at 390 px and 1440 px).
   - The guestbook modal texts (`GuestbookModal.astro`, min-heights already reserved; just confirm).
   - Any other `[data-error]`, `[data-status]` or `aria-live` element under `components/` and `scripts/`.

   Fix the real occurrences with the same approach. For each candidate, list in the report what you found and whether you changed it. Don't touch what is already stable.

## Constraints

- Minimal, surgical diffs following the existing patterns. No new dependencies, no new tokens. Keep motion code out of form scripts (motion lives in its own modules).
- Reserving space with a `min-height` is acceptable **only** where a message is expected to stay visible. Don't add a permanent empty gap to forms that normally have no message (design fidelity).
- CSP rules, i18n (no string changes expected), reduced motion and forced colours unaffected.
- Existing e2e specs in `apps/web/e2e/` may assert the clear-on-submit behaviour. Re-read those that touch guestbook, contact and phone errors, and update them only if the asserted behaviour intentionally changed (say why in the report).

## Allowed files

`apps/web/src/scripts/guestbook-form.ts`, `apps/web/src/scripts/phone-reveal.ts`, `apps/web/src/scripts/contact-form.ts`, `apps/web/src/components/guestbook/GuestbookForm.astro`, `apps/web/src/components/contact/ContactDetails.astro`, `apps/web/src/components/contact/ContactForm.astro`, `apps/web/src/components/contact/FormField.astro`, any other component or script **only** if the audit finds the same bug there (name it in the report), the matching `apps/web/e2e/*.spec.ts` only if needed, `tasks/T-063-stable-form-messages.md` (commit this spec), `tasks/reports/T-063/**`.

## Acceptance criteria

1. Guestbook: with the rate-limit message shown, clicking the submit button again does not move the button or anything below the message at any point (verify with element bounding boxes across the request, not just by eye).
2. The phone-reveal failure and the contact-form failure behave the same way (or the report shows they were already stable).
3. A repeated identical failure is still announced to assistive tech (explain how in the report).
4. `pnpm verify` green.

## Validation

- `pnpm verify`.
- Throwaway Playwright script (not committed) against `pnpm --filter @portfolio/web build` + `pnpm --filter @portfolio/web exec astro preview --port 4403`. **Use port 4403 only**: the owner runs `pnpm dev` on 3000/4321, so never touch those and kill only PIDs you started. Stub the API with `page.route`: `POST **/api/guestbook` → 429 `{ "error": { "code": "RATE_LIMITED", "message": "x" } }` with a ~800 ms delay (check the exact error shape in `docs/api.md`). Do the same for contact (`POST **/api/contact`) and the phone reveal endpoint. Record the submit button's `boundingBox().y` before, during and after the second click, at 390 px and 1440 px. Put the numbers in the report.
- Don't run `pnpm test:e2e` (CI runs it).
- Tests: only if you extract new pure logic into `lib/`. No CSS tests.
