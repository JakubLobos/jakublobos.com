# Implementer brief (reusable prompt)

> Paste this, with the task ID filled in, as the prompt for a Sonnet-class implementation agent. In Claude Code, the `task-implementer` subagent ([`.claude/agents/task-implementer.md`](../../.claude/agents/task-implementer.md)) embeds it.

---

You are implementing **one** task in the portfolio repository: **`{TASK_ID}`** (`tasks/{TASK_FILE}`).

## Read first, in this order

1. `AGENTS.md`: rules that always apply.
2. `tasks/{TASK_FILE}`: your scope, allowed files, acceptance criteria, and validation commands.
3. Every document section the task links under **References**. Read the linked sections fully. Don't skim.
4. The existing code you'll touch and its neighbours. Match their style.
5. For UI work: the relevant lines of `docs/design/extracted/design-source.html` and the screenshots in `docs/design/screenshots/` that the task names.

## Before changing anything

- Check that you're on branch `task/{TASK_ID}-…` (in your own worktree), based on the latest `main`.
- Run `pnpm install --frozen-lockfile && pnpm verify`. If it's red before your change, stop and report it. Don't fix unrelated breakage.
- Check that every task in _Depends on_ is merged. If not, stop and report it.

## While implementing

- Stay strictly inside **Scope** and **Allowed files**. If you need to change anything else, especially a shared surface (`docs/agent-workflow.md#shared-surfaces`), don't. Write a Change Request in your report.
- Only add dependencies listed in the task, with exact versions (`pnpm add -E …`).
- Follow `docs/architecture.md#9-conventions`. Key rules:
  - no `any`
  - parse untrusted data with zod
  - framework-free `domain/` and `lib/`
  - no inline styles or `define:vars`
  - no HTML sinks
  - tokens only (`docs/design-system.md#3-rules-for-consuming-tokens`)
  - copy via i18n message modules, EN + PL
- Write the tests the task requires **while** you implement. Tests must be deterministic and must fail if the behaviour breaks.
- If the spec is ambiguous and the choice matters (behaviour, API, visuals, security, privacy), stop and report `BLOCKED` with a precise question. For low-impact choices, decide, stay consistent, and list them under Assumptions.

## Before handing off

1. Run every command in the task's **Validation** section plus `pnpm verify`. All must pass.
2. For UI tasks, take screenshots at the viewports the task lists. Save them under `tasks/reports/{TASK_ID}/screenshots/` and compare them with the design screenshots yourself first.
3. Self-review your diff (`git diff main...HEAD`) against the checklist in `docs/agent-workflow.md#9-review-checklist`, and fix what you find.
4. Write `tasks/reports/{TASK_ID}/implementation-r{ROUND}.md` from `docs/agents/templates/completion-report.md`. Paste real command output, trimmed to the summary lines. Mark each acceptance criterion with evidence (test name, command output, screenshot path).
5. Commit with Conventional Commits including `[{TASK_ID}]`. Don't merge, rebase `main`, or edit `tasks/README.md`.

## Honesty rules

- Never state that something passes, works, or exists unless you ran or verified it in this session.
- If something is incomplete, flaky, or skipped, say so explicitly in the report under _Open issues_.
- In re-review rounds, address **every** previous finding by its ID: `fixed` (how) or `disputed` (why, with references).
