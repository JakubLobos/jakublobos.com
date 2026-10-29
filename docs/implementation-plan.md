# Implementation plan

The executable backlog is [`tasks/README.md`](../tasks/README.md). This document covers phasing, milestones, risks, readiness, and the handoff.

## 1. Phases

| Phase                          | Status                                                     | Output                                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Discovery and research      | **Done** (2026-10-25, two rounds)                          | Design unpacked and rendered; requirements; research with sources (`research.md` §1–§8)                                                                                     |
| 2. Architecture and decisions  | **Done** (revised after the second round of owner answers) | `architecture.md`, `api.md`, `guestbook-moderation.md`, `design-system.md`, `security.md`, `testing.md`, 14 ADRs, decision register (all implementation decisions answered) |
| 3. Structure and task planning | **Done**                                                   | Verified root tooling, agent instructions, 32 task specs                                                                                                                    |
| 4. Plan validation             | **Done**                                                   | Coverage matrix, link and anchor checks, consistency pass                                                                                                                   |
| 5. Implementation              | Not started                                                | Waves 1–6                                                                                                                                                                   |
| 6. Release                     | Not started                                                | Gate D, owner go-live actions (D-23), PL review (D-02), resume PDFs (D-10)                                                                                                  |

## 2. Milestones

| Milestone                      | Tasks                                           | Demonstrable result                                                                                                                                  |
| ------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1: Skeleton**               | T-001, T-010, T-011, T-020                      | `pnpm verify` green; `pnpm dev` runs site + API; tokens visible in `/__showcase`                                                                     |
| **M2: Backend + edge**         | T-012…T-017                                     | Guestbook (newest-wins, layered review) and contact (Resend) fully tested; the Worker negotiates locale; `pnpm preview` runs the production topology |
| **M3: Site visually complete** | T-021…T-028, T-031                              | All sections and chrome match the design (EN + PL drafts)                                                                                            |
| **M4: Integrated**             | T-029, T-030, T-032, T-033, T-035, T-040, T-051 | End-to-end guestbook and contact; consent + analytics; OG images; CI + site deploy workflow                                                          |
| **M5: Release candidate**      | T-034, T-041, T-042, T-043, T-050               | All gates green; Railway + Cloudflare deployed; owner sign-offs                                                                                      |

## 3. Key risks and mitigations

| Risk                                                  | Likelihood   | Impact | Mitigation                                                                                                   |
| ----------------------------------------------------- | ------------ | ------ | ------------------------------------------------------------------------------------------------------------ |
| Typing-mirror misalignment across browsers or IME     | Medium       | Medium | Isolated in T-028 with fallbacks; WebKit e2e                                                                 |
| Sticky timeline feel differs from the prototype       | Medium       | Medium | Prototype formulas in `lib/timeline.ts`; step screenshots                                                    |
| Astro CSP vs analytics scripts                        | Medium       | Medium | Analytics init in bundled code (no inline); exact origin allowlist; e2e CSP guard                            |
| Railway `X-Real-IP` semantics change                  | Low          | Medium | Validation + fallback; global caps independent of IP; go-live verification                                   |
| Suitability classifier over-rejects (false positives) | Medium       | Low    | By design acceptable (image first); reasons logged; model and prompt versioned; threshold and prompt tunable |
| Prompt injection                                      | Low          | Low    | Runs after rules + moderation; strict schema; can only reject or approve already-clean text                  |
| OpenAI / Resend pricing or terms change               | Low          | Medium | Ports allow swapping providers; caps bound usage; budget limit                                               |
| PostHog cookieless legal interpretation               | Medium       | Low    | Flagged for the owner's legal review; can switch to consent-only with one config change                      |
| Shared-file conflicts between parallel agents         | Medium       | High   | Stub-first composition, per-area modules, shared-surface rules, one-at-a-time merges                         |
| Railway redeploy downtime (volume)                    | High (brief) | Low    | The site stays up on Cloudflare; UI error states; deploys only on API path changes                           |

## 4. Readiness assessment

| Item                                                | State                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Design analyzed; assets available                   | PASS                                                                                     |
| Requirements, architecture, and decisions           | PASS All implementation-relevant owner decisions answered (D-01…D-22)                    |
| Root tooling (ESLint, Prettier, TS base, workspace) | PASS Installed and verified                                                              |
| Packages scaffolded                                 | FAIL Intentionally not done; T-001 is the first task                                     |
| Task specs                                          | PASS 32 tasks, each with allowed files, ACs, validation                                  |
| Agent definitions and briefs                        | PASS                                                                                     |
| Git                                                 | PASS Initialized on `main`, **no commits yet**                                           |
| Blocking items for implementation                   | PASS None                                                                                |
| Blocking items for go-live                          | WARN D-23 owner actions (accounts, keys, DNS, credits), D-10 resume PDFs, D-02 PL review |

**Verdict:** ready to start wave 1 (T-001) once the initial commit exists.

## 5. Handoff: how to start

1. Make the initial commit of this planning state on `main`, and push to GitHub (needed later for Railway deploys and CI).
2. Dispatch **T-001** to the `task-implementer` subagent (Sonnet): `Implement T-001 (round 1). Follow docs/agents/implementer-brief.md.`
3. Dispatch `task-reviewer` (Opus) on its branch, then rebase, run `pnpm verify`, squash-merge, and mark it `DONE`.
4. Wave 2: T-010, T-011, T-020 in parallel worktrees. Continue per `tasks/README.md` (waves and conflict guards).
5. Owner, in parallel with implementation and before M5: work through D-23 (Cloudflare zone, Railway Hobby, OpenAI credits + budget, Resend domain, GA4 property, PostHog EU project with the cookieless setting).
