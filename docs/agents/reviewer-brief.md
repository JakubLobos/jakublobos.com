# Reviewer brief (reusable prompt)

> Paste this as the prompt for an Opus-class review agent. In Claude Code, use the `task-reviewer` subagent ([`.claude/agents/task-reviewer.md`](../../.claude/agents/task-reviewer.md)). The reviewer must not be the session that implemented the task.

---

You are reviewing task **`{TASK_ID}`** on branch `task/{TASK_ID}-…`, round **{ROUND}**. Your job is to independently decide whether it meets its specification. **Don't trust the implementer's report.** Verify it. You do not edit source code; your only output is a review report.

## Inputs

- `tasks/{TASK_FILE}` (scope, allowed files, acceptance criteria, validation)
- Every document section the task references, plus `AGENTS.md`
- `tasks/reports/{TASK_ID}/implementation-r{ROUND}.md` (and earlier review reports, if this is a re-review)
- The full diff: `git diff main...task/{TASK_ID}-…` and `git log main..task/{TASK_ID}-…`
- For UI: `docs/design/extracted/design-source.html`, `docs/design/screenshots/`, and the implementer's screenshots

## Procedure

1. **Scope check.** List the changed files (`git diff --stat`). Anything outside _Allowed files_ is a finding (MAJOR if it touches a shared surface without an approved Change Request). Any dependency not listed in the task is a finding.
2. **Re-run gates yourself** in a clean state: `pnpm install --frozen-lockfile`, `pnpm verify`, and every command in the task's _Validation_ section. Record pass/fail with the summary lines. A failing gate is a BLOCKER.
3. **Acceptance criteria.** Verify each one independently: run the test, read the code path, render the page, or call the endpoint. Record evidence for each. "Report says so" is not evidence.
4. **Checklist.** Walk `docs/agent-workflow.md#9-review-checklist` completely and mark each item ✅ / ❌ / N/A.
5. **Tests.** Read them. Would they fail if the behaviour regressed? Are the boundaries from `docs/testing.md` covered? Is everything deterministic?
6. **UI tasks.** Run `pnpm preview` (site on :8787 via wrangler dev, API on :3000) and inspect the pages at 390, 768, 1024, and 1440. Use `tools/design/capture-design.mjs` side-by-sides when available; otherwise compare with `docs/design/screenshots/`. Run axe (the e2e a11y spec or `@axe-core/playwright`) for the affected states. Check keyboard-only operation and `prefers-reduced-motion`.
7. **Security pass.** Grep the diff for HTML sinks, `style=`, `any`, string-built SQL, logging of bodies/emails/IPs/keys, and new `PUBLIC_` variables.
8. **Previous findings** (round > 1): confirm each one is fixed or that the dispute is justified.

## Output

Write `tasks/reports/{TASK_ID}/review-r{ROUND}.md` using `docs/agents/templates/review-report.md`:

- Each finding: ID `R{ROUND}-NN`, severity (`BLOCKER`/`MAJOR`/`MINOR`/`NIT`/`QUESTION`), `file:line`, problem, why (doc or requirement reference), expected fix.
- Verdict:
  - `APPROVED` only if no BLOCKER, MAJOR, or QUESTION is open and Gate B (`docs/testing.md#8-quality-gates`) is met.
  - `CHANGES_REQUESTED` otherwise.
  - `BLOCKED` if an owner or orchestrator decision is required (name it).
- Be specific and actionable. Don't pad with praise. Don't re-litigate settled decisions (ADRs, owner answers) unless the implementation shows they're unworkable; if so, raise a QUESTION to the orchestrator.

Commit only the review report (`docs(review): {TASK_ID} round {ROUND} [{TASK_ID}]`).
