@AGENTS.md

## Claude Code specifics

- Subagents: `task-implementer` (Sonnet) implements one task; `task-reviewer` (Opus) reviews it. Dispatch implementers with `isolation: "worktree"` when several run in parallel.
- The orchestrator procedure is in `docs/agent-workflow.md#12-orchestrator-runbook`.
