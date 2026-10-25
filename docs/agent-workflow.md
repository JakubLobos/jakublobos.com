# Agent-orchestrated development workflow

How implementation is delegated to AI coding agents, reviewed by a stronger model, and accepted. Reusable prompts: [`agents/implementer-brief.md`](agents/implementer-brief.md) and [`agents/reviewer-brief.md`](agents/reviewer-brief.md). Claude Code subagents: [`.claude/agents/`](../.claude/agents/).

## 1. Roles

| Role             | Who                                                             | Responsibilities                                                                                                                                                                                        | May edit                                           |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Owner**        | Jakub (human)                                                   | Product decisions ([`decisions/open-questions.md`](decisions/open-questions.md)), copy sign-off, secrets, deployment, final approval of visuals                                                         | anything                                           |
| **Orchestrator** | Owner, or an Opus-class planning agent acting for them          | Picks ready tasks, dispatches implementers, assigns reviewers, merges, maintains [`tasks/README.md`](../tasks/README.md) status, owns shared surfaces and ADRs, resolves conflicts, escalates decisions | `tasks/README.md`, `docs/**`, shared surfaces (§4) |
| **Implementer**  | Sonnet-class agent, **one task at a time**                      | Implements exactly one task spec on its own branch or worktree, writes tests, runs Gate A, writes the completion report                                                                                 | files in the task's _Allowed files_ list           |
| **Reviewer**     | Opus-class agent, **never the same session as the implementer** | Independently verifies the task against spec, docs, and checklist, re-runs gates, writes the review report and verdict                                                                                  | review report only. Reviewers do **not** fix code. |

## 2. Task lifecycle

```
 TODO ──► READY ──► IN_PROGRESS ──► IN_REVIEW ──► APPROVED ──► DONE (merged)
            ▲            │              │
            │            │              └─► CHANGES_REQUESTED ──► IN_PROGRESS (round n+1)
            │            └─► BLOCKED (spec gap / decision needed) ──► orchestrator/owner resolves ──┘
            └── all dependencies DONE
```

- **READY** = every task in _Depends on_ is `DONE` and no linked open decision blocks it.
- Only the orchestrator changes statuses in `tasks/README.md`. This avoids concurrent edits of one file.
- **Round limit:** after 3 `CHANGES_REQUESTED` rounds, the orchestrator escalates. It splits the task, clarifies the spec, or reassigns.

## 3. Branches, worktrees, and commits

- Branch per task: `task/T-024-hero-mascot` from the latest `main`.
- Parallel agents each work in their own **git worktree** (`git worktree add ../portfolio-T-024 -b task/T-024-hero-mascot`, or the Claude Code Agent tool with `isolation: "worktree"`) so they never share a working directory.
- Commits: Conventional Commits with the task ID: `feat(web): hero mascot with pointer tracking [T-024]`. Small, logical commits. No unrelated changes.
- Merge: the orchestrator rebases onto `main`, re-runs Gate C ([`testing.md` §8](testing.md#8-quality-gates)), then **squash-merges**.
- Merge order within a wave: tasks touching fewer shared surfaces first.

<a id="shared-surfaces"></a>

## 4. Shared surfaces and ownership

These files define cross-task interfaces. A task may modify one **only if its spec lists it under Allowed files**. Otherwise the implementer writes a **Change Request** section in the completion report: what, why, and the proposed diff. The orchestrator approves it and applies it in a dedicated commit or task.

| Shared surface                                                                                                                | Created by                                            | Notes                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root configs: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`             | Planning (done) / T-001                               | Dependency additions only as listed in the task                                                                                                                                  |
| `pnpm-lock.yaml`                                                                                                              | any task that adds a listed dependency                | Conflicts are resolved by re-running `pnpm install` after rebase, never by hand-editing                                                                                          |
| `packages/contracts/**`, `docs/api.md`                                                                                        | T-010                                                 | The frontend/backend interface; changes need both sides' review                                                                                                                  |
| `apps/web/src/styles/tokens.css`, `docs/design-system.md`                                                                     | T-020                                                 | Token changes ripple everywhere                                                                                                                                                  |
| `apps/web/src/layouts/BaseLayout.astro`, `components/pages/*`                                                                 | T-020 (shell), T-021 (completes)                      | Sections are composed here. Section and chrome tasks edit **only their own component files**; T-021 creates stub components with final names, so composition never changes later |
| `apps/web/src/i18n/{locales,t}.ts`, `i18n/messages/{common,seo,errors}.ts`, `src/content/profile.ts`, `src/lib/api/client.ts` | T-021                                                 | Other message and content _modules_ are per-area and owned by the area's task                                                                                                    |
| `apps/web/src/dev/showcase.astro`, `integrations/dev-showcase.ts`                                                             | T-020                                                 | UI-primitive tasks may append sections to the showcase                                                                                                                           |
| `apps/server/src/http/rate-limit.ts`, `domain/shared/*`                                                                       | T-011                                                 | Route tasks configure their limiters in their own route files                                                                                                                    |
| `apps/web/security-headers.ts`, `apps/web/wrangler.jsonc`, `apps/web/worker/**`, `integrations/cloudflare-headers.ts`         | T-016                                                 | Header or CSP changes go through a Change Request (they affect every page and the Worker)                                                                                        |
| `apps/server/src/http/client-ip.ts`, `middleware/cors.ts`, `middleware/allowed-origin.ts`                                     | T-011                                                 | Security-critical; changes need reviewer sign-off on `security.md` T8/T9                                                                                                         |
| `apps/web/astro.config.ts`                                                                                                    | T-001, then T-020 (fonts), T-021 (i18n, sitemap, CSP) |                                                                                                                                                                                  |
| `apps/server/src/app.ts`, `main.ts`, `config.ts`                                                                              | T-011                                                 | Route tasks register routes through the `registerRoutes` list in `app.ts`. Adding a line there is listed in their Allowed files                                                  |
| `apps/server/src/infra/db/migrations/*`                                                                                       | T-012                                                 | New migration file per schema change; never edit an applied migration                                                                                                            |
| `docs/**`, ADRs                                                                                                               | Orchestrator                                          | Implementers propose changes in their report                                                                                                                                     |

<a id="dependencies"></a>

## 5. Dependencies policy

- Allowed packages are listed in [`architecture.md` §10](architecture.md#10-approved-dependencies) and in each task. Install with **exact versions** (`pnpm add -E`).
- Anything else needs an orchestrator decision first. Implementers stop and record a Change Request with the justification, size, maintenance status, and alternatives.

## 6. Handling ambiguity

- **Spec gap with material impact** (behaviour, API, visuals, security, or privacy): stop, set the task to `BLOCKED` in the report, and write the question. Don't guess.
- **Low-impact gap** (internal naming, a test helper's shape): decide, keep it consistent with the docs, and list it under _Assumptions_ in the report.
- **Design ambiguity:** the extracted design source and screenshots win over memory or convention. If they conflict, the source code wins (it's what renders).
- **Doc vs doc conflict:** report it. Precedence: owner decisions in `open-questions.md` > ADRs > `api.md` / `guestbook-moderation.md` > other docs > task text.

## 7. Implementer protocol (summary; full text in `agents/implementer-brief.md`)

1. Read: `AGENTS.md` → the task file → every doc section the task references → the existing code it touches.
2. Confirm dependencies are merged and `pnpm install && pnpm verify` is green on the fresh branch before changing anything.
3. Implement only the task scope. Write tests alongside the code.
4. Run Gate A and the task's validation commands. Fix until green.
5. For UI tasks, capture screenshots at the task's viewports, plus design side-by-sides once `tools/design/capture-design.mjs` exists (T-042).
6. Write `tasks/reports/T-xxx/implementation-r<round>.md` from the [template](agents/templates/completion-report.md) and commit it with the work.
7. **Never** claim a check passed without pasting its output. Never mark acceptance criteria met without evidence.

## 8. Review protocol (summary; full text in `agents/reviewer-brief.md`)

1. Read the task, referenced docs, the implementer report, and the full diff (`git diff main...task/T-xxx`).
2. **Re-run** Gate A and the task's validation commands in a clean state (`pnpm install --frozen-lockfile`). Don't trust the report's output.
3. Verify each acceptance criterion independently and record the evidence.
4. Walk the checklist (§9). For UI, inspect screenshots against `docs/design/screenshots/` and the source.
5. Write `tasks/reports/T-xxx/review-r<round>.md` from the [template](agents/templates/review-report.md) with a verdict.

## 9. Review checklist

Each item: ✅ / ❌ (→ finding) / N/A.

**Requirements and design**

- [ ] Every acceptance criterion is met, with evidence.
- [ ] Behaviour matches the referenced FR/NFR IDs and docs; nothing out of scope was added.
- [ ] UI matches `design-analysis.md` and screenshots at 390/768/1024/1440 (spacing, type, colour, states, motion); deviations are only approved decisions.

**Correctness**

- [ ] Edge cases: empty, boundary lengths, Unicode, concurrency, double submit, network failure, timeouts, resize, and reduced motion as relevant.
- [ ] Errors handled explicitly; nothing swallowed; user-visible failures have UI.
- [ ] No race conditions in async UI or worker code; listeners and timers cleaned up.

**Architecture and maintainability**

- [ ] Respects layer boundaries (`domain` free of Express/SQLite/fetch; `lib` free of DOM; no web↔server imports).
- [ ] Small focused modules; no duplication of rules that live in `contracts`; no speculative abstractions.
- [ ] Names and file placement follow [`architecture.md` §9](architecture.md#9-conventions).
- [ ] Comments explain _why_ only.

**Type safety**

- [ ] No `any`, no unjustified `as` casts or non-null assertions; untrusted data parsed with zod or narrowed.
- [ ] Discriminated unions handled exhaustively.

**Security and privacy**

- [ ] No unsafe HTML sinks; untrusted text via `textContent`.
- [ ] Inputs validated at the boundary; prepared statements only.
- [ ] No secrets or PII in code, logs, fixtures, or client bundles; `PUBLIC_*` has no secrets.
- [ ] CSP-compatible: no inline styles, scripts, or handlers.

**Accessibility**

- [ ] Semantic elements; correct names, roles, and states; landmarks; heading order.
- [ ] Full keyboard operation and visible focus; dialogs handle focus correctly.
- [ ] Reduced motion and forced colours respected; contrast per approved tokens.
- [ ] axe: zero serious/critical violations on affected pages and states.

**Responsive and performance**

- [ ] Works at all three breakpoints and in between (320–1920 px); no horizontal scroll; touch targets ≥ 24 px (44 px where the design has them).
- [ ] No layout shift from async content; scroll/pointer handlers rAF-throttled and passive.
- [ ] No new dependency or JS weight beyond the task's budget.

**Tests**

- [ ] Required tests from the task and `testing.md` exist and **would fail if the behaviour broke** (check assertions, not just presence).
- [ ] Deterministic: no real time, network, randomness, or credentials.

**Process**

- [ ] Only allowed files changed; Change Requests raised for anything else.
- [ ] Commit messages follow the convention; the report is complete and honest.

## 10. Findings and verdicts

| Severity     | Meaning                                                                                                                             | Blocks approval?                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **BLOCKER**  | Security hole, data loss or exposure, failed gate, broken build, invariant violated, acceptance criterion unmet                     | Yes                                                                                          |
| **MAJOR**    | Incorrect behaviour or edge case, accessibility violation, missing required tests, notable design deviation, architecture violation | Yes                                                                                          |
| **MINOR**    | Maintainability or readability issue, small visual offset, weak test assertion                                                      | No. Fix in the next round if one happens; otherwise the orchestrator may log it as follow-up |
| **NIT**      | Style preference                                                                                                                    | No                                                                                           |
| **QUESTION** | Reviewer needs clarification; may become a finding                                                                                  | Resolved before approval                                                                     |

Each finding records: ID (`R1-03`), severity, file:line, the problem, why it matters (doc or requirement reference), and the expected fix or acceptance condition.

**Verdicts:** `APPROVED` (no open BLOCKER/MAJOR/QUESTION; Gate B met) · `CHANGES_REQUESTED` (back to the implementer with the findings) · `BLOCKED` (needs an owner or orchestrator decision; cite the decision).

**Re-review:** the implementer addresses each finding by ID in `implementation-r<n+1>.md` (fixed / disputed with reasoning). The reviewer checks all previous findings and the new diff.

## 11. Definition of Done (every task)

1. All acceptance criteria verified by the reviewer, with evidence.
2. Gate B approved and Gate C passed on the rebased branch.
3. Tests added per the task and `testing.md`; coverage floors respected.
4. Docs updated if behaviour or interfaces changed (via Change Request if they're shared).
5. Squash-merged to `main`, and status `DONE` in `tasks/README.md` with links to its reports.

## 12. Orchestrator runbook

1. Before each wave: pull `main` and check that `pnpm verify` is green. Pick `READY` tasks from the wave in [`tasks/README.md`](../tasks/README.md), and don't dispatch two tasks that both list the same shared surface.
2. Dispatch each implementer with the brief + task ID (Claude Code: `task-implementer` subagent in a worktree).
3. When a report lands, dispatch the `task-reviewer` subagent on that branch.
4. On `APPROVED`: rebase, run Gate C, squash-merge, update the status and report links, and notify dependants.
5. On `BLOCKED`: add or update the decision in `open-questions.md`, ask the owner, and record the answer in the ADR or doc before resuming.
6. After each wave: update docs if reality diverged from the plan. Docs describe what is, not what was hoped.
