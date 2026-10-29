# {TASK_ID}: Implementation report, round {N}

- **Branch:** `task/{TASK_ID}-…` @ `{short-sha}`
- **Status claimed:** READY_FOR_REVIEW | BLOCKED
- **Agent / model:** {model id}

## Summary

2–5 sentences: what was built and how it fits the architecture.

## Files changed

| File   | Change                    |
| ------ | ------------------------- |
| `path` | added / modified: purpose |

## Acceptance criteria

| #    | Criterion (short) | Status  | Evidence                                                               |
| ---- | ----------------- | ------- | ---------------------------------------------------------------------- |
| AC-1 | …                 | ✅ / ❌ | test `name` in `file.test.ts`, command output below, screenshot `…png` |

## Validation output

```
$ pnpm verify
… (summary lines: format, lint, typecheck, test counts, build) …
$ {task-specific commands}
…
```

## Tests added

- `path/to/file.test.ts`: what is covered (boundaries, failure modes)

## Screenshots (UI tasks)

`tasks/reports/{TASK_ID}/screenshots/…` at 390 / 768 / 1024 / 1440; notes on any visual differences from the design.

## Assumptions (low-impact decisions taken)

- …

## Deviations from spec or design

- … (should be none without an approved decision; list them anyway)

## Change Requests (shared surfaces / dependencies)

- **CR-1:** file, proposed change, reason.

## Open issues and follow-ups

- … (anything incomplete, flaky, or skipped; be explicit)

## Previous findings (re-review rounds only)

| Finding | Resolution             |
| ------- | ---------------------- |
| R1-01   | fixed: … / disputed: … |
