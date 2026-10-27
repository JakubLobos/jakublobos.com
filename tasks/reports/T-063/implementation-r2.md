# T-063: Implementation report, round 2

- **Branch:** `task/T-063-stable-form-messages`
- **Status claimed:** READY_FOR_REVIEW

## Findings addressed

- **R2-01 (fixed).** `guestbook-form.ts`: `showError`/`clearError` replaced by one `setError(text = '', invalid = false)`. The `switch` is as on `main` (including `case 'ignored': break;`). No early return and no clear before the switch. Each outcome writes the message once (`empty`, `sent`: `setError()`; `field-error`, `failed`: `setError(text…)`); the `input` listener calls `setError()`. One why-comment at the top of `submitMessage`. Side effect: a `failed` outcome now also drops a stale `aria-invalid`, which the old `showError(…, false)` left alone.
- **Comments.** The contact comment no longer claims clear-then-set is needed for re-announcement. The phone comment is reduced to the layout reason. No code lines existed only for that false reason, so none were removed. Contact and phone logic is unchanged from round 1.

## Evidence

- Guestbook submit button layout y, 1440 px, second submit with a 429 after 800 ms: before 5823, during 5823, after 5823 (0 px). The message was still shown at the end.
- `pnpm verify`: green (format, lint, typecheck, test, build, budgets; ended with "Budgets OK."). Preview on port 4403 only; PID 40360 killed.
