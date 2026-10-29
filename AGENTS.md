# AGENTS.md: rules for every coding agent in this repository

This repo is built by AI agents working on task specs in `tasks/`, reviewed by a stronger model. Read this file completely before any work.

## Where things are

| Need                                       | Go to                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Your assignment                            | `tasks/T-xxx-*.md` (index and status: `tasks/README.md`)                                                                   |
| How work flows, review, Definition of Done | `docs/agent-workflow.md`                                                                                                   |
| Your prompt brief                          | `docs/agents/implementer-brief.md` / `docs/agents/reviewer-brief.md`                                                       |
| What to build                              | `docs/requirements.md` (FR/NFR IDs)                                                                                        |
| How it should look                         | `docs/design-analysis.md`, `docs/design-system.md`, `docs/design/extracted/design-source.html`, `docs/design/screenshots/` |
| How it is structured                       | `docs/architecture.md`, `docs/api.md`, `docs/guestbook-moderation.md`                                                      |
| Security and testing rules                 | `docs/security.md`, `docs/testing.md`                                                                                      |
| Why decisions were made                    | `docs/decisions/` (ADRs) and `docs/decisions/open-questions.md`                                                            |

**Never open `docs/design/design.html` directly** (a 1.9 MB bundle). Use `docs/design/extracted/design-source.html`.

## Stack (pinned; don't change without an ADR)

Node ≥ 24.11 · pnpm workspaces (one monorepo, two deployables) · TypeScript 6.0.x (not 7) · Astro 7 static output on **Cloudflare Workers static assets** (+ a tiny Worker for `/` and `/set-language`) · Express 5 API on **Railway** (`api.jakublobos.com`, CORS) · better-sqlite3 · zod 4 · Resend (HTTPS email) · OpenAI moderation + gpt-5-nano suitability · Vitest 5 · Playwright 1.64 · wrangler 4. Approved dependencies: `docs/architecture.md#10-approved-dependencies`.

## Commands

```
pnpm install --frozen-lockfile   # install
pnpm dev                         # web :4321 (proxies /api) + server :3000
pnpm verify                      # format:check · lint · typecheck · test · build  ← must pass before review
pnpm preview                     # build + production topology: site+Worker on :8787 (Node edge emulator; real wrangler dev crashes on this Windows host), API on :3000 (after T-016)
pnpm test:e2e                    # Playwright + axe against the built site (after T-040)
```

**Windows note:** stopping `pnpm dev` from a background shell can orphan `astro dev`/`node` children. Kill only the PIDs you started (`taskkill /PID <pid> /T /F`) and confirm ports 3000/4321/8787 are free with `netstat -ano | findstr :<port>`.

## Non-negotiable rules

1. **Scope.** Do only your task and edit only its _Allowed files_. Use Change Requests for shared surfaces (`docs/agent-workflow.md#shared-surfaces`).
2. **No `any`.** Parse untrusted data (HTTP, env, provider responses, storage, `data-*` JSON) with zod or explicit narrowing.
3. **Layering.** `apps/server/src/domain` has no Express, SQLite, `fetch`, or `process.env`. `apps/web/src/lib` has no DOM. `web` and `server` never import each other; both may import `@portfolio/contracts` (web: no `/schemas`).
4. **Server TypeScript runs with Node type stripping.** Erasable syntax only: no `enum`, `namespace`, or constructor parameter properties. Relative imports end in `.ts`. Use `import type` for types.
5. **Security.** No `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`set:html`/`eval` (one approved exception: JSON-LD in `components/seo/Seo.astro`, `docs/security.md` §3). Untrusted text goes in via `textContent`. Prepared SQL statements only. Never log message bodies, emails, names, IPs, or secrets. **Never put the owner's real phone number anywhere in the repo** (code, content, fixtures, docs, screenshots); it exists only in the API env (`CONTACT_PHONE`, ADR-0015). Use `+48000000000` in fixtures. Secrets never go in `PUBLIC_*` vars or client code.
6. **CSP compatibility.** No `style="…"` attributes, no `define:vars`, no inline event handlers. Dynamic styling via `element.style.setProperty('--var', …)` or `data-*` attributes.
7. **Design fidelity.** Use tokens only (`docs/design-system.md` §3). Don't redesign. Additions or deviations need an approved decision (`docs/decisions/open-questions.md`).
8. **No emoji.** No emoji anywhere in the repo, and no emoji or Unicode pictographic/arrow glyphs as UI icons. Icons are inline SVG components (`aria-hidden`, `currentColor`, sized with tokens), like `components/ui/CheckIcon.astro`. In docs and reports use words (`PASS` / `FAIL` / `WARN` / `N/A`). The only exception is test data that exercises emoji in user input (D-37).
9. **i18n.** No hard-coded UI strings. Add EN **and** PL to the area's message module (PL drafts are flagged for owner review in the report).
10. **Accessibility.** Semantic HTML, keyboard support, visible focus, reduced-motion and forced-colors support, axe clean.
11. **Tests.** Deterministic, next to the code (`*.test.ts`), covering the boundaries in `docs/testing.md`. No real network, credentials, or paid APIs.
12. **Dependencies.** Only those listed in your task, with exact versions (`pnpm add -E`).
13. **Honesty.** Never claim a check passed or a file exists without verifying it in this session. Report gaps.
14. **Comments** explain _why_, not _what_. No commented-out code.
15. **Commits.** Conventional Commits with the task ID, e.g. `feat(web): marquee bands [T-025]`.
