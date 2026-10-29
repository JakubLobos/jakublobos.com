# {TASK_ID}: Review, round {N}

- **Reviewed:** `task/{TASK_ID}-…` @ `{short-sha}` against `main` @ `{short-sha}`
- **Reviewer / model:** {model id}
- **Verdict:** APPROVED | CHANGES_REQUESTED | BLOCKED ({decision ID})

## Gate results (re-run by reviewer)

| Command                          | Result                |
| -------------------------------- | --------------------- |
| `pnpm install --frozen-lockfile` | PASS / FAIL           |
| `pnpm verify`                    | PASS / FAIL (summary) |
| task validation commands         | PASS / FAIL           |

## Scope check

Files outside _Allowed files_: none / list. Unlisted dependencies: none / list.

## Acceptance criteria (independently verified)

| #    | Status      | Evidence gathered by reviewer |
| ---- | ----------- | ----------------------------- |
| AC-1 | PASS / FAIL | …                             |

## Checklist

Requirements & design PASS · Correctness PASS · Architecture PASS · Type safety PASS · Security & privacy PASS · Accessibility PASS · Responsive & performance PASS · Tests PASS · Process PASS (FAIL items have findings)

## Findings

| ID      | Severity | Location            | Problem | Why (ref)                    | Expected fix |
| ------- | -------- | ------------------- | ------- | ---------------------------- | ------------ |
| R{N}-01 | MAJOR    | `apps/web/src/…:42` | …       | FR-27, design-analysis §4.11 | …            |

## Previous findings status (round > 1)

| ID    | Status                                   |
| ----- | ---------------------------------------- |
| R1-01 | resolved / still open / accepted dispute |

## Notes for orchestrator

Follow-ups for the backlog, doc drift noticed, decisions needed.
