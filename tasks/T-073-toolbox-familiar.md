# T-073: Technically correct groups in My toolbox, plus "Familiar with"

- **Wave:** 7 (content) · **Size:** S · **Depends on:** none
- **Owner request (2026-10-28):** Next.js, Node.js and React Native are technologies the owner knows much less well than React or Astro, so they get their own group. Scope extension: the whole section is regrouped so each group is technically correct.

## Change (data only, `apps/web/src/content/skills.ts`)

Final groups, in order (PL labels are flagged for owner review):

1. Core / Podstawy: React, TypeScript, Astro
2. Design / Projektowanie (new): UI/UX, Figma
3. UI & styling / UI i stylowanie (new): Tailwind, styled-components, MUI, Tamagui, Storybook, react-email
4. State & APIs / Stan i API (renamed from "Data & state"): Redux Toolkit, TanStack, WebSocket, gRPC
5. Libraries / Biblioteki (new): Formik, Yup, Superstruct, i18next, Chart.js, ts-money
6. Testing / Testowanie: Jest, Vitest, React Testing Library, Playwright
7. Workflow / Workflow: Git, GitHub Packages, monorepo, PostHog, A/B testing, AI-assisted coding
8. Familiar with / Miałem styczność (new, last): Next.js, Node.js, React Native

## Why

- The "Frameworks" group is gone. Astro moves to Core because the owner knows it as well as React.
- SSG is dropped. It is a rendering technique that Astro already implies, not a tool.
- MUI, Tamagui and styled-components are UI libraries, not frameworks. Storybook moves to UI too, because it is not a test runner.
- WebSocket and gRPC are protocols, hence "State & APIs".
- A/B testing leaves Testing: it is product experimentation done with PostHog. Spelled "A/B testing" to match Projects.
- "AI" becomes "AI-assisted coding", matching Projects and avoiding any implication of ML work.

## Allowed files

`apps/web/src/content/skills.ts`, `docs/content/pl-copy-review.md`, this spec, `tasks/reports/T-073/`.

## Validation

`pnpm verify` green; the PL labels do not overflow at 390 and 1440 px.
