# T-070: Projects section — new content, multi-paragraph descriptions, links

- **Wave:** 7 (content) · **Size:** S–M · **Depends on:** T-026 (projects section, done)
- **Owner decision (2026-10-27, D-33):** the Projects section ("I’m specializing in making web-apps" / "Specjalizuję się w tworzeniu aplikacji webowych") gets the owner's new project list (below), replacing all five current entries (the "Volunteer matching system" entry is dropped). Projects may now carry **external links** (an approved addition to the design). The section heading, eyebrow and layout stay as they are.

## Content (source of truth — use verbatim, except the fixes listed below)

Order = the order below; numbers `01`–`05` follow it.

1. **id `game-hosting-platform`** · org `Vitresoft`
   - title EN: `Game Hosting Platform & Server Management Dashboard` · PL: `Platforma hostingu gier i panel zarządzania serwerem`
   - stack: React, TypeScript, Redux Toolkit, gRPC, monorepo, react-email, Formik, i18next, TanStack, Chart.js, styled-components, Superstruct, Yup, posthog-js, A/B testing, ts-money, Astro, Jest, React Testing Library, Playwright, UI/UX design, AI-assisted coding
   - EN ¶1: I developed key modules of a game server hosting platform, including the server management panel (settings, payment flow, an in-browser file manager (WebFTP), a web console, and server configurators). I also worked on the public-facing website: the homepage, offer pages, payment forms, and a server builder tailored to users' needs. The platform caters to a wide audience, from young gamers to experienced server administrators, so I focused on making complex functionality simple and accessible.
   - EN ¶2: I was responsible for UI/UX design, including a redesign, as well as for developing the company's internal TypeScript frontend libraries. I started as part of a frontend team and later became the sole frontend developer on the product, taking full ownership of the codebase and its technical direction.
   - PL ¶1: Rozwijałem kluczowe moduły platformy hostingu serwerów gier, w tym panel zarządzania serwerem (ustawienia, proces płatności, przeglądarkowy menedżer plików WebFTP, konsolę webową i konfiguratory serwerów). Pracowałem również nad publiczną częścią platformy: stroną główną, stronami ofertowymi, formularzami płatności oraz kreatorem serwerów dopasowanym do potrzeb użytkowników. Platforma jest skierowana do szerokiego grona odbiorców, od młodych graczy po doświadczonych administratorów, dlatego skupiałem się na tym, by złożone funkcje przedstawiać prosto i przystępnie.
   - PL ¶2: Odpowiadałem za projektowanie UI/UX, w tym redesign, a także za rozwój wewnętrznych bibliotek frontendowych firmy w TypeScripcie. Zaczynałem w zespole frontendowym, a później zostałem jedynym frontend developerem w tym produkcie, przejmując pełną odpowiedzialność za kod i kierunek jego rozwoju.
   - links: website `https://craftserve.com/` (the Vitresoft product this project is; owner-provided)
2. **id `item-shop-builder`** · org `Vitresoft`
   - title EN: `Item Shop Builder` · PL: `Item Shop Builder`
   - stack: React, TypeScript, Redux, Chart.js, Formik, i18next, ts-money, Yup, MUI, styled-components
   - EN: An application that allows game server administrators to build their own item shops, where players can purchase virtual products. I worked on it as part of a team, alongside other frontend and backend developers. After moving to another product, I continued to support the project by supervising the interns working on it.
   - PL: Aplikacja umożliwiająca administratorom serwerów gier budowanie własnych itemshopów, w których gracze mogą kupować wirtualne produkty. Pracowałem nad nią w zespole, razem z innymi frontend i backend developerami. Po przejściu do innego produktu nadal wspierałem projekt, nadzorując pracę praktykantów.
3. **id `streamer-event-apps`** · org `Vitresoft`
   - title EN: `Web Apps for Events Hosted by Popular Polish Streamers` · PL: `Aplikacje webowe na wydarzenia popularnych polskich streamerów`
   - stack: React, TypeScript
   - EN: I developed a variety of web applications for online events hosted by some of Poland's most popular gaming streamers. I worked both independently and as part of a team, often under tight deadlines.
   - PL: Tworzyłem różnorodne aplikacje webowe na potrzeby wydarzeń online organizowanych przez jednych z najpopularniejszych polskich streamerów gamingowych. Pracowałem zarówno samodzielnie, jak i w zespole, często pod presją krótkich terminów.
4. **id `psychological-support-platform`** · org `Fundacja Peryskop`
   - title EN: `Free Psychological Support Platform` · PL: `Platforma bezpłatnej pomocy psychologicznej`
   - stack: React, TypeScript, Next.js, Tamagui, TanStack, Formik, WebSocket, i18next, PostHog, Tailwind, Vitest, UI/UX design
   - EN ¶1: I developed the frontend of a platform for a foundation providing free psychological support, including a dedicated real-time chat. The platform features an admin panel for approving applications, matching people seeking support with volunteers, approving and editing articles, managing user permissions, forms, and chats, and browsing large lists such as user directories.
   - EN ¶2: I also designed the application's UI. To support the mobile app, I created a shared UI component library built on Tamagui, used by both the web app and the React Native app.
   - PL ¶1: Stworzyłem frontend platformy fundacji oferującej bezpłatną pomoc psychologiczną, wraz z dedykowanym czatem działającym w czasie rzeczywistym. Platforma zawiera panel zarządzania, w którym można akceptować formularze, łączyć podopiecznych z wolontariuszami, akceptować i redagować artykuły, zarządzać uprawnieniami użytkowników, formularzami i czatami oraz przeglądać duże listy, takie jak listy użytkowników.
   - PL ¶2: Zaprojektowałem także interfejs aplikacji. Na potrzeby aplikacji mobilnej stworzyłem współdzieloną bibliotekę komponentów UI opartą na Tamagui, wykorzystywaną zarówno w aplikacji webowej, jak i w aplikacji napisanej w React Native.
   - links: website `https://fundacjaperyskop.org/` · frontend code `https://github.com/fundacja-peryskop/MentalHealthCharity-front-v2` · UI library `https://github.com/fundacja-peryskop/ui`
5. **id `this-portfolio`** · org **none**
   - title EN: `This Portfolio` · PL: `To portfolio`
   - stack: Astro, Node.js
   - EN: You're looking at it right now. · PL: Właśnie tu jesteś!
   - links: source code `https://github.com/JakubLobos/jakublobos.com`

**Fixes applied by the orchestrator (keep them):** PL title `Te portfolio` → `To portfolio` (grammar; flag in report). EN apostrophes become typographic `’` (users’, company’s, Poland’s, You’re, application’s), matching the rest of the site. Everything else verbatim — including EN Title Case titles (owner's choice) and the stack items that aren't strictly technologies (`monorepo`, `A/B testing`, `UI/UX design`, `AI-assisted coding`). PL keeps going through `polishTypography` (every title and every paragraph).

## Data model (`apps/web/src/content/projects.ts`)

- Each project: `id`, `title: Localized`, `paragraphs: Record<Locale, readonly string[]>` (replaces `desc`), `org: string | null`, `tags` (stack, kept in English in every locale), optional `links: readonly ProjectLink[]`.
- `ProjectLink = { kind: 'website' | 'frontend' | 'ui' | 'source'; href: string }`. Labels come from i18n (below), never from content. Hrefs are absolute `https://` constants.
- Derive the display number (`01`…) from the index instead of hard-coding `n` (one source of truth for order). Use the `id` for anything that needs a stable key.
- The type should make it impossible for EN and PL to drift silently in paragraph count only if it's cheap; otherwise don't bother (no new tests required for content).

## Rendering (`apps/web/src/components/sections/Projects.astro`)

- One `<p>` per paragraph inside `.main`, with a token gap between them (e.g. `--space-8`/`--space-12`). Keep `.desc` look (max width, colour, `text-wrap: pretty`).
- `org: null` → render no org element at all (no empty `<p>`).
- **Links:** a small list after the paragraphs in `.main` (e.g. `<ul class="links">` with inline items, the same `·` separator idiom as `.tags`, or a compact row — your call, it must look intentional in the hand-made paper style). Link style follows the existing external-link pattern in `Experience.astro` (`color: var(--color-primary)`, underline, `text-underline-offset: var(--space-4)`, `target="_blank" rel="noopener noreferrer"`). A trailing `↗` glyph is fine if `aria-hidden`. Give the list an accessible name from i18n (e.g. `Links` / `Linki`). Make each link's accessible text unique enough out of context: "Website", "Frontend code", "UI library", "Source code" are acceptable since they sit inside the project row; if screen-reader link lists would show duplicates across rows, that's fine for now (only three projects have links).
- **Long stack:** project 1 has 22 stack items in the `.meta` column (`--project-meta-basis: 200px`). Check at 390/768/1024/1440 that it reads well; if it's an unbalanced tower, propose the smallest token-only adjustment and explain in the report (don't redesign the row).
- Tokens only; component-scoped style (ADR-0008); CSP rules; forced-colors: links stay distinguishable (underline). Reduced motion unaffected.

## i18n (`apps/web/src/i18n/messages/projects.ts`)

Add EN + PL: `links` (list label: `Links` / `Linki`) and `link.{website,frontend,ui,source}`: `Website` / `Strona`, `Frontend code` / `Kod frontendu`, `UI library` / `Biblioteka UI`, `Source code` / `Kod źródłowy`. Flag PL for owner review.

## Docs

- `docs/content/pl-copy-review.md`: update the "Content: projects" section and the projects message rows (regenerate with the repo's export tool if there is one; say which).
- `docs/decisions/open-questions.md`: record **D-33** (owner, 2026-10-27): projects list replaced with owner-provided content; external links allowed on project rows.

## Allowed files

`apps/web/src/content/projects.ts`, `apps/web/src/components/sections/Projects.astro`, `apps/web/src/i18n/messages/projects.ts`, `apps/web/src/styles/tokens.css` + `docs/design-system.md` (only if a project-layout token genuinely needs adjusting; say why), `docs/content/pl-copy-review.md`, `docs/decisions/open-questions.md` (D-33 only), e2e specs or unit tests that assert old project titles/descriptions (only if they break), `tasks/T-070-projects-content.md` (commit this spec, prettier-formatted), `tasks/reports/T-070/**`.

## Acceptance criteria

1. `/` and `/pl/` show the five projects in the order above with the exact copy (plus the listed fixes); multi-paragraph projects render as separate paragraphs.
2. The game hosting platform shows one link (craftserve.com), Peryskop three, the portfolio one; all open in a new tab with `rel="noopener noreferrer"`; labels localized.
3. The portfolio row shows no org line and no empty element.
4. No horizontal overflow at 390/768/1024/1440 in both locales; long tag lists wrap cleanly; axe clean on the section.
5. `pnpm verify` green (incl. `check:budgets`).

## Validation

- `pnpm verify`.
- Throwaway Playwright script (not committed): `pnpm --filter @portfolio/web build` + `pnpm --filter @portfolio/web exec astro preview --port 4410`. **Port 4410 only**: the owner runs `pnpm dev` on 3000/4321; kill only PIDs you started.
  - Screenshot the projects section at 390 and 1440 in EN and PL (max 4 PNGs in `tasks/reports/T-070/screenshots/`, list them).
  - Assert `scrollWidth <= clientWidth` on `<html>`, link `href`/`target`/`rel`, and run axe on `#projects`.
- Grep `e2e/` for old project titles; don't run `pnpm test:e2e`.
- PR via `"C:\Program Files\GitHub CLI\gh.exe"`; conventional commit with `[T-070]`.

## Addendum (2026-10-28)

Owner request: add the stack items now listed in Projects to the Skills ("My toolbox") section. Add only, never remove or rename. Only `apps/web/src/content/skills.ts` changed, with items appended to the existing groups (no new groups):

- Frameworks: Node.js, Tamagui, MUI, styled-components, react-email
- Data & state: gRPC, Formik, Yup, Superstruct, i18next, Chart.js, ts-money
- Testing: Playwright
- Workflow: monorepo, PostHog

Skipped as already covered: Redux (Redux Toolkit), posthog-js (PostHog), UI/UX design (UI/UX), AI-assisted coding (AI), A/B testing (already present). Screenshots: `tasks/reports/T-070/screenshots/skills-en-390.png` and `skills-en-1440.png`.
