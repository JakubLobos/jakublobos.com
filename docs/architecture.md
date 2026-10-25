# Architecture

Status: **Accepted for implementation** (revised 2026-10-25 after owner decisions D-03…D-17). Decisions are recorded as ADRs in [`decisions/`](decisions/README.md).

## 1. System overview

```
                         Cloudflare (jakublobos.com)                            Railway (api.jakublobos.com)
 Browser ── HTTPS ──►  ┌──────────────────────────────────────────┐            ┌───────────────────────────────────────────────────┐
  EN /  PL /pl         │ Workers static assets (free, global)     │            │ Express 5 · Node 24 · 1 replica · volume /data    │
                       │  • dist/** served as static + _headers   │            │  ├─ CORS allowlist (https://jakublobos.com)       │
                       │  • Worker runs ONLY for:                 │            │  ├─ GET  /api/guestbook/latest                    │
                       │      GET /             locale negotiation│            │  ├─ POST /api/guestbook ─► SQLite (better-sqlite3)│
                       │      GET /set-language explicit switch   │            │  │        └─ ReviewWorker ─► rules → OpenAI       │
                       │  • 404-page: nearest 404.html            │            │  │           moderation → gpt-5-nano suitability ─┼─► api.openai.com
                       └──────────────────────────────────────────┘            │  ├─ POST /api/contact ─► ResendMailer ────────────┼─► api.resend.com
                       │                                          │            │  ├─ POST /api/contact/phone ─► TurnstileVerifier ──┼─► challenges.cloudflare.com
          │                                                                    │  └─ GET  /api/health                              │
          └──────────── fetch() cross-origin (CORS, JSON) ────────────────────►└───────────────────────────────────────────────────┘
          └── after consent: GA4 (googletagmanager.com) · PostHog EU (eu.i.posthog.com, cookieless on reject)
```

- **Site:** Astro 7, `output: 'static'`, deployed as a Cloudflare Worker with static assets ([ADR-0014](decisions/0014-hosting-cloudflare-workers-and-railway.md)). Interactivity comes from small framework-free TypeScript custom elements ([ADR-0002](decisions/0002-astro-static-no-ui-framework.md)).
- **Edge logic:** a ~100-line Worker for `/` language negotiation and `/set-language` ([ADR-0007](decisions/0007-i18n-routing-and-locale-negotiation.md)).
- **API:** Express 5 on Railway: guestbook, contact, health, and the review worker ([ADR-0003](decisions/0003-express-single-node-service.md)).
- **Data:** SQLite on a Railway volume ([ADR-0004](decisions/0004-sqlite-better-sqlite3.md)).
- **External services:** OpenAI (moderation + suitability, [ADR-0005](decisions/0005-openai-moderation-with-local-rules.md)), Resend (email, [ADR-0010](decisions/0010-contact-form-email-delivery.md)), GA4 + PostHog (consent-gated analytics, [ADR-0011](decisions/0011-consent-gated-analytics.md)). All provider integrations sit behind interfaces with fakes for development and tests.
- **Topology constraints:** the API runs as exactly **one** instance (SQLite, in-memory rate limits, in-process worker; Railway forbids replicas with volumes anyway). The site keeps working when the API is down; the guestbook and contact form show their error states.

## 2. Repository layout (pnpm workspaces)

```
portfolio/
├─ apps/
│  ├─ web/                    @portfolio/web     Astro static site + Cloudflare Worker (worker/) + wrangler.jsonc
│  └─ server/                 @portfolio/server  Express API (Railway)
├─ packages/
│  └─ contracts/              @portfolio/contracts  shared API types, constants, zod schemas, validation rules
├─ e2e/                       Playwright end-to-end + accessibility tests (wrangler dev + API server)
├─ tools/                     dev-only scripts (design capture, OG images, budgets, i18n export)
├─ docs/  tasks/  .claude/agents/  AGENTS.md  CLAUDE.md
└─ eslint.config.js · .prettierrc.json · tsconfig.base.json · pnpm-workspace.yaml · .env.example
```

Rationale: [ADR-0001](decisions/0001-pnpm-workspaces-monorepo.md).

### Dependency rules

```
apps/web (site + worker) ──► packages/contracts  (types, constants, rules only; never "/schemas" → no zod in client or worker)
apps/server              ──► packages/contracts  (types, constants, rules, schemas)
apps/web ✗ apps/server    apps/server ✗ apps/web
```

## 3. Shared contracts: `packages/contracts`

```
src/
  index.ts        re-exports constants, types, rules (no runtime zod import)
  constants.ts    LOCALES, PAINT_IDS, DEFAULT_PAINT, GUESTBOOK_*, CONTACT_* limits
  types.ts        API DTOs, ErrorCode, FieldErrorCode, ApiSuccess<T>, ApiErrorBody
  schemas.ts      zod schemas (export path "@portfolio/contracts/schemas"; server only)
  rules/          guestbook-content.ts, contact-fields.ts (pure; shared by server and web)
```

The source is consumed directly as TypeScript (Vite for web and worker, Node type stripping for the server; [ADR-0009](decisions/0009-typescript-6-and-node-type-stripping.md)). The full contract is in [`api.md`](api.md). **Changing `contracts` or `api.md` is a shared-surface change** ([`agent-workflow.md`](agent-workflow.md#shared-surfaces)).

## 4. Frontend: `apps/web`

### 4.1 Rendering and hosting

| Concern                                             | Strategy                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages (`/`, `/pl`, `/privacy`, `/pl/privacy`, 404s) | Prerendered (`output: 'static'`, `build.format: 'file'`, `trailingSlash: 'never'`). Output: `index.html`, `pl.html`, `privacy.html`, `pl/privacy.html`, `404.html`, `pl/404.html`. Cloudflare serves `pl.html` at `/pl` (`html_handling: auto-trailing-slash`) and the nearest `404.html` on misses. |
| Language detection at `/`                           | The Cloudflare Worker (§6). Astro can't do it for static pages.                                                                                                                                                                                                                                      |
| Security and cache headers                          | `apps/web/security-headers.ts` is the single source. An Astro integration (`integrations/cloudflare-headers.ts`) writes `dist/_headers` at build; the Worker imports the same module for its own responses.                                                                                          |
| API calls                                           | Cross-origin to `PUBLIC_API_BASE_URL` (prod `https://api.jakublobos.com`; dev `''`, so `/api` is proxied by `astro dev` to `:3000`).                                                                                                                                                                 |
| Latest guestbook message                            | Fetched client-side when the section nears the viewport. The static HTML ships the **loading** state; JS swaps to the message, empty, or error state (D-12).                                                                                                                                         |
| Interactivity                                       | Astro `<script>` modules defining **custom elements**. No UI framework.                                                                                                                                                                                                                              |
| Analytics                                           | `scripts/analytics.ts` loads on idle; GA4 and PostHog as lazy chunks (ADR-0011).                                                                                                                                                                                                                     |
| Content                                             | Typed TS data modules per locale (`src/content/*.ts`).                                                                                                                                                                                                                                               |

### 4.2 Directory structure

```
apps/web/
├─ astro.config.ts            static output, i18n, fonts, CSP, sitemap, integrations, dev proxy /api → :3000
├─ wrangler.jsonc             name, main: worker/index.ts, assets { directory: ./dist, binding: ASSETS,
│                             not_found_handling: 404-page, run_worker_first: ["/", "/set-language"] }
├─ security-headers.ts        single source of site security + cache headers (Worker and _headers)
├─ integrations/              dev-showcase.ts (dev-only routes), cloudflare-headers.ts (writes dist/_headers)
├─ worker/                    Cloudflare Worker: index.ts (fetch handler), negotiate-locale.ts (pure),
│                             set-language.ts (allowlisted redirect), tsconfig.json (workers types)
├─ public/                    robots.txt, favicon, og/og-{en,pl}.png (T-035), resume/*.pdf (owner, D-10)
└─ src/
   ├─ pages/                  index, privacy, 404 + pl/{index,privacy,404}: one-line wrappers
   ├─ layouts/BaseLayout.astro
   ├─ components/
   │  ├─ pages/               HomePage, PrivacyPage, NotFoundPage (composition only)
   │  ├─ seo/Seo.astro
   │  ├─ site/                Header, DesktopNav, MobileMenu, SocialAside, Footer, LanguageSwitcher,
   │  │                       CookieBanner, CustomScrollbar, SkipLink, DecorLayer
   │  ├─ sections/            Hero, MarqueeBands, Experience, Projects, Skills, Guestbook, Contact
   │  ├─ guestbook/           LastVisitorQuote, GuestbookForm, PaintPicker, GuestbookModal
   │  ├─ contact/             ContactDetails, ContactForm, FormField
   │  ├─ decor/               PaintDrips, Mascot, CookieIcon
   │  └─ ui/                  Button, ChromeButton, SectionHeading, Highlight, Spinner, CheckIcon, TypingField
   ├─ scripts/                custom elements + DOM glue (one file per element), analytics.ts
   ├─ dev/                    showcase.astro, og.astro: dev-only, injected only under `astro dev`
   ├─ lib/                    PURE, DOM-free logic (unit-tested in Node)
   │  ├─ api/client.ts        generic typed fetch wrapper → ApiResult<T>                (T-021)
   │  ├─ api/guestbook.ts  api/contact.ts                                               (T-029, T-030)
   │  ├─ analytics/ga4.ts  analytics/posthog.ts  (provider adapters)                    (T-032)
   │  ├─ timeline.ts  scrollbar.ts  pupil.ts  consent.ts  breakpoints.ts  paints.ts  text-diff.ts
   ├─ i18n/                   locales.ts, t.ts, messages/<area>.ts ({ en, pl } per area)
   ├─ content/                experience.ts, projects.ts, skills.ts, marquee.ts, profile.ts
   └─ styles/                 tokens.css, base.css, utilities.css, keyframes.css
```

### 4.3 Patterns

- **Astro components are presentational.** Props are typed with `interface Props`; copy comes from `t()` or content modules.
- **Client modules** are custom elements:
  ```ts
  class GuestbookFormElement extends HTMLElement {
    connectedCallback() {
      /* query own children, attach listeners with AbortController */
    }
    disconnectedCallback() {
      this.#abort.abort();
    }
  }
  customElements.define('guestbook-form', GuestbookFormElement);
  ```
  Testable logic lives in `lib/`. Localized runtime strings are passed as a `data-messages` JSON attribute, which is parsed and validated, never evaluated.
- **No inline styles.** State goes in `data-*` and `aria-*` attributes. Continuous values are set via `element.style.setProperty('--x', …)` inside `requestAnimationFrame`.
- **Listeners** are passive and rAF-throttled, cleaned up on disconnect. Prefer `IntersectionObserver`.
- **Dialogs** use native `<dialog>` + `showModal()`.
- **Untrusted text** is written only with `textContent` ([`security.md`](security.md#xss)).

### 4.4 Client API layer

`lib/api/client.ts` exposes `request<T>(path, init, guard)`. It prefixes `import.meta.env.PUBLIC_API_BASE_URL`, sends `Content-Type: application/json` for bodies, uses `credentials: 'omit'` and a 10 s timeout, never throws, and validates the body with a caller-supplied type guard (no zod in the client):

```ts
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'validation'; fields: Partial<Record<string, FieldErrorCode[]>> }
  | { ok: false; kind: 'rate_limited'; retryAfterSeconds: number | null }
  | { ok: false; kind: 'unavailable' | 'network' | 'unexpected' };
```

UI maps `kind` → `i18n/messages/errors.ts` (generic) and field codes → the feature's message module.

## 5. Backend: `apps/server`

### 5.1 Layers

```
src/
├─ main.ts                    composition root: config → logger → db + migrations → providers → services
│                             → review worker → app → listen; graceful shutdown (SIGTERM/SIGINT)
├─ config.ts                  zod-validated env → frozen Config; production safety checks
├─ logger.ts                  pino factory, redaction
├─ app.ts                     createApp(deps): Express instance, no I/O at import (supertest)
├─ http/
│  ├─ middleware/             request-id, request-logger, security-headers, cors (allowlist), allowed-origin,
│  │                          require-json, error-handler, not-found
│  ├─ client-ip.ts            resolveClientIp(req, source): X-Real-IP (validated) | socket
│  ├─ rate-limit.ts           per-client limiter factory (keyed by resolveClientIp) + global caps
│  ├─ respond.ts              ok() / fail() envelope helpers
│  └─ routes/                 guestbook.routes.ts, contact.routes.ts, phone.routes.ts, health.routes.ts
├─ domain/                    framework-free business logic (no express, sqlite, fetch, process.env)
│  ├─ guestbook/
│  │  ├─ guestbook.service.ts       submit(), latest()
│  │  ├─ normalize.ts               dedupe key + content hash
│  │  ├─ quality-rules.ts           silent heuristics (gibberish, shouting, floods)
│  │  ├─ blocked-terms.ts           curated EN/PL list + matcher
│  │  ├─ review-pipeline.ts         moderation → suitability → decision
│  │  ├─ review-worker.ts           newest-pending processing, backoff, expiry
│  │  ├─ moderation-policy.ts  backoff.ts
│  │  ├─ repository.port.ts  moderation.port.ts  suitability.port.ts
│  ├─ contact/                contact.service.ts, mailer.port.ts, human-verifier.port.ts, phone.ts (formatter)
│  └─ shared/                 clock.ts, ids.ts, ttl-cache.ts, result.ts
├─ infra/
│  ├─ db/                     connection.ts, migrate.ts, migrations/*.sql, guestbook.repository.ts
│  ├─ moderation/             openai-moderation.provider.ts, fake-moderation.provider.ts
│  ├─ suitability/            openai-suitability.reviewer.ts, prompt.ts, fake-suitability.reviewer.ts
│  ├─ mail/                   resend.mailer.ts, console.mailer.ts
│  └─ verification/           turnstile.verifier.ts, fake.verifier.ts
└─ cli/                       guestbook-admin.ts (list/export/delete/purge), backup.ts
```

**Dependency direction:** `http → domain ← infra`, wired by `main.ts`. Domain code depends only on the `*.port.ts` interfaces.

### 5.2 Request pipeline (order matters)

1. Request ID + pino-http logging (redacted, no IPs).
2. Security headers (helmet; API CSP `default-src 'none'; frame-ancestors 'none'`).
3. **CORS** (`cors` package): `origin` ∈ `CORS_ALLOWED_ORIGINS`, methods `GET, POST, OPTIONS`, headers `Content-Type, X-Request-Id`, `maxAge: 600`, no credentials. Disallowed origins get no CORS headers, so the browser blocks the response.
4. `/api/*` POST: **allowed-origin** check (403 if `Origin` is missing or not allowlisted) and `require-json` (415) run **before** any body parsing (a foreign site can never make the server parse a body), then `express.json({ limit })` (guestbook 8 KB, contact 16 KB, phone 4 KB) and per-client rate limiters (429). Client-side body errors map to 400/413/415 and are logged at `warn`; only genuine 5xx are logged at `error`.
5. Routes → services.
6. API 404 → JSON envelope. Central error handler → `INTERNAL` envelope (no stack traces).

**Client IP:** `resolveClientIp` reads `X-Real-IP` when `CLIENT_IP_SOURCE=x-real-ip` (Railway), validates it with `net.isIP`, and otherwise falls back to the socket address. Express `trust proxy` is left off. The rate-limit key is the IP (IPv6 normalized to /56 via express-rate-limit's `ipKeyGenerator`). IPs are never logged or persisted.

### 5.3 Guestbook

Specified in [`guestbook-moderation.md`](guestbook-moderation.md): newest-wins queue, three-layer review, invariants, retention, private archive, flood analysis.

### 5.4 Contact

`ContactService.send(input)`: validate (contracts rules) → honeypot → global caps → `Mailer.send({ replyTo, subject, text }, { idempotencyKey: clientRequestId })`. `ResendMailer` posts to the Resend API with `Idempotency-Key`. Failure → `503 MAIL_UNAVAILABLE`. Nothing is persisted.

## 6. Internationalization (i18n)

| Topic                                        | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locales                                      | `en` (default, unprefixed `/`), `pl` (`/pl`). Astro `i18n: { locales: ['en','pl'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Pages                                        | `src/pages/*.astro` (en) and `src/pages/pl/*.astro`, one-line wrappers around shared page components taking `locale`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| UI strings                                   | `src/i18n/messages/<area>.ts` exports `defineMessages({ en, pl })`. A missing PL key is a **type error**. One module per area, so tasks don't collide.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Content                                      | `src/content/*.ts` exports `Record<Locale, T>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| SEO                                          | hreflang en / pl / x-default (→ `/`), self-canonical, `og:locale` + alternate, sitemap with i18n alternates, localized OG images (T-035).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Negotiation** (Worker, `apps/web/worker/`) | **`GET /`**: cookie `lang=pl` → 302 `/pl`; cookie `lang=en` → serve `index.html` from `env.ASSETS`. Otherwise parse `Accept-Language` (q-values; primary subtag; tie → header order): best `pl` → 302 `/pl`, else English. Always `Vary: Accept-Language, Cookie`, `Cache-Control: private, no-cache`, plus security headers. **`GET /set-language?lang=en\|pl&to=/path`**: set `lang` (1 year, `Path=/`, `SameSite=Lax`, `Secure`, `HttpOnly`) → 302 to `to` if it's in the allowlist (`/`, `/pl`, `/privacy`, `/pl/privacy`), else to the locale home. Invalid `lang` → 400 plain text. Redirects are always **302**. Only `/` is negotiated; all other URLs are explicit. |
| Switcher                                     | `LanguageSwitcher.astro`: plain links to `/set-language?lang=pl&to=/pl` (equivalent path per page). Works without JS. `robots.txt` disallows `/set-language`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Limitations                                  | Google discourages auto-redirects; Googlebot sends no `Accept-Language` and gets English; hreflang and the sitemap expose `/pl`. Under `astro dev` there is no Worker; negotiation is exercised by unit tests and by `wrangler dev` in e2e and preview.                                                                                                                                                                                                                                                                                                                                                                                                                      |

## 7. Configuration

**API (`apps/server/src/config.ts`):** zod-parsed env; on failure it logs variable **names** only and exits 1. Production rules: refuse `MODERATION_PROVIDER=fake`, `SUITABILITY_PROVIDER=fake`, `MAILER=console`; require `OPENAI_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `CONTACT_RECIPIENT_EMAIL`, `CONTACT_PHONE`, `TURNSTILE_SECRET_KEY`, and `CORS_ALLOWED_ORIGINS` (https only); refuse `HUMAN_VERIFIER=fake`. The phone number exists **only** in this environment (ADR-0015). Secrets are never logged and never reach the client. Local dev loads `.env` via `node --env-file-if-exists`. Behavioural limits (rate limits, caps, retention) are code constants.

**Site (build time, `PUBLIC_*`):** `PUBLIC_SITE_URL`, `PUBLIC_API_BASE_URL`, `PUBLIC_GA4_ID`, `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST`, `PUBLIC_TURNSTILE_SITE_KEY`. These are public by nature (they ship in client code). Cloudflare deploys pass them as build env in CI.

The full list is in [`.env.example`](../.env.example).

## 8. Development, build, and deployment

| Command         | What it does                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`      | `astro dev` (:4321, proxies `/api` → :3000) + API (`node --watch`, :3000) with fake providers, console mailer, and `CORS_ALLOWED_ORIGINS=http://localhost:4321`                                                                  |
| `pnpm build`    | `astro check && astro build` (writes `dist/` + `dist/_headers`); the server has no build step                                                                                                                                    |
| `pnpm preview`  | Build + the Node edge emulator (site + real Worker code on :8787) + API on :3000: the production topology locally. `preview:edge:wrangler` runs the real `wrangler dev` (Linux/CI; workerd crashes on the owner's Windows build) |
| `pnpm verify`   | format:check → lint → typecheck → unit/integration tests → build                                                                                                                                                                 |
| `pnpm test:e2e` | Playwright + axe against `pnpm preview`-style topology with fakes and a temp DB                                                                                                                                                  |
| Deploy: site    | CI on `main`: `pnpm --filter @portfolio/web build && wrangler deploy` (Cloudflare API token in CI secrets)                                                                                                                       |
| Deploy: API     | Railway builds `apps/server/Dockerfile` from GitHub `main`. Volume `/data`; health check `/api/health`.                                                                                                                          |

See `docs/operations.md` (created by T-050).

## 9. Conventions

- **Language:** TypeScript everywhere. The server and contracts use erasable syntax only: no `enum`, `namespace`, or parameter properties. Relative imports carry `.ts` extensions.
- **Naming:** files `kebab-case.ts`; Astro components `PascalCase.astro`; custom elements `kebab-case` tag + `PascalCaseElement` class; constants `SCREAMING_SNAKE_CASE` only in `contracts`.
- **Errors:** expected outcomes are discriminated unions; only unexpected failures throw; never swallow errors; `catch (error: unknown)` and narrow.
- **No `any`.** Use `unknown` + zod or explicit guards at trust boundaries.
- **Comments** explain _why_.
- **Dependencies:** listed here or in the task; exact versions.
- **Tests:** next to the code (`*.test.ts`); e2e in `/e2e`.
- **Commits:** Conventional Commits with the task ID.

## 10. Approved dependencies

| Package                                                                                                       | Where             | Why                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `astro` 7.4.x, `@astrojs/check`, `@astrojs/sitemap`                                                           | web               | framework, `.astro` type-check, sitemap                                                                                  |
| `wrangler` 4.152.x, `@cloudflare/workers-types` 5.20261023.1                                                  | web (dev)         | Worker build, deploy, `wrangler dev` (CI parity)                                                                         |
| `posthog-js` 1.438.x                                                                                          | web               | PostHog (lazy chunk, consent-aware)                                                                                      |
| `express` 5.3.x, `helmet` 8.3.x, `cors` 2.8.x (+ `@types/cors`)                                               | server            | HTTP, headers, CORS allowlist                                                                                            |
| `express-rate-limit` 8.7.x                                                                                    | server            | rate limiting (`ipKeyGenerator`)                                                                                         |
| `pino`, `pino-http` (`pino-pretty` dev)                                                                       | server            | structured logs with redaction                                                                                           |
| `better-sqlite3` 13.0.x                                                                                       | server            | SQLite                                                                                                                   |
| `zod` 4.6.x                                                                                                   | contracts, server | validation at trust boundaries                                                                                           |
| `vitest` 5.0.x, `@vitest/coverage-v8`, `supertest`                                                            | all / server      | tests                                                                                                                    |
| `@playwright/test`, `@axe-core/playwright`                                                                    | root (dev)        | e2e, accessibility, design capture, OG generation                                                                        |
| `typescript` 6.0.3                                                                                            | all (dev)         | pinned below 7 (ADR-0009)                                                                                                |
| `eslint` 10.13.x, `typescript-eslint` + `@typescript-eslint/parser` 8.72.x, `eslint-plugin-astro`, `prettier` | root (dev)        | lint and format; the parser is declared at the root so `eslint-plugin-astro` never resolves a copy from outside the repo |

Deliberately not used: React/Preact, Tailwind, ORMs, OpenAI or Resend SDKs (single `fetch` calls), nodemailer (SMTP blocked on Railway Hobby), dotenv, Redis, CAPTCHA (escalation path only), GA via Tag Manager container.
