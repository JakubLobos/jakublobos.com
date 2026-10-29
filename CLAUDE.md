@AGENTS.md

## Claude Code specifics

- Subagents: `task-implementer` (Sonnet) implements one task; `task-reviewer` (Opus) reviews it. Dispatch implementers with `isolation: "worktree"` when several run in parallel.
- UI icons are inline SVG components (`aria-hidden`, `currentColor`, e.g. `components/ui/CheckIcon.astro`), never emoji or emoji-style glyphs.
- The orchestrator procedure is in `docs/agent-workflow.md#12-orchestrator-runbook`.
