# T-028: Implementation report, round 2

- **Branch:** `task/T-028-typing-field` (HEAD; `main` merged in, `showcase.astro` conflict resolved by keeping all sections)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: `reset()` now clears the value and dispatches a bubbling `input` event; the element's own listener resyncs the mirror, so consumers' counters update.                                                                                                                                                                           |
| R1-02   | fixed: the `type` prop is gone and the control is always `type="text"`, so `value` is never trimmed and the mirror matches the raw text. Email fields pass `inputmode="email"` and `autocomplete="email"` and validate in script. The showcase email fields were updated.                                                              |
| R1-03   | fixed (docs): the comment at the multi-line word-box rule and this report now say that after an over-long unbreakable token the following lines can reflow differently from the textarea (caret and selection drift; the value is unaffected). The r1 "only the line after" wording is superseded. Backlog item is the orchestrator's. |
| R1-04   | fixed: the `ResizeObserver` is kept in a private field and disconnected in `disconnectedCallback` (the `fonts.ready` callback only calls `#grow()`, which is a no-op without a control, and does not accumulate observers).                                                                                                            |
| R1-05   | fixed: the duplicate combining-accent `diffUnits` test is deleted (the `splitGraphemes` test covers it).                                                                                                                                                                                                                               |

## API notes for T-029 / T-030 (replaces the r1 list where different)

- Props: `as?` (`input` default | `textarea`), `id`, `name`, `maxlength`, `placeholder`; optional `inputmode?`, `autocomplete?`, `rows?`, `autoGrow?`, `required?`, `disabled?`, `invalid?`, `describedBy?`, `ariaLabel?`, `variant?` (`underline` | `bare`). **No `type` prop.**
- T-030 email field: `<TypingField id name="email" inputmode="email" autocomplete="email" maxlength={120} … />`; no native email validation, use the zod/regex check.
- `reset()` fires `input` (bubbles), so counters update without extra code.

## Validation output

See the final reply for the `pnpm verify` summary.
