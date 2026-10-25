# Architecture Decision Records

Format: lightweight MADR (context → decision → alternatives → consequences → sources). Status values: `Proposed` · `Accepted` · `Amended` · `Superseded by ADR-xxxx`. Product questions for the owner live in [`open-questions.md`](open-questions.md); once answered, the outcome is folded into the relevant ADR or doc.

| ADR                                                    | Title                                                                   | Status                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------- |
| [0001](0001-pnpm-workspaces-monorepo.md)               | pnpm workspaces monorepo (web, server, contracts)                       | Accepted                  |
| [0002](0002-astro-static-no-ui-framework.md)           | Astro static output, no UI framework; custom elements for interactivity | Accepted                  |
| [0003](0003-express-single-node-service.md)            | Express 5 for the API service                                           | Accepted, amended by 0014 |
| [0004](0004-sqlite-better-sqlite3.md)                  | SQLite via better-sqlite3                                               | Accepted                  |
| [0005](0005-openai-moderation-with-local-rules.md)     | Layered guestbook review: rules → OpenAI moderation → LLM suitability   | Accepted (D-06)           |
| [0006](0006-guestbook-state-model-and-retention.md)    | Newest-wins moderation queue, retention ≤ 100, private archive          | Accepted (D-05, D-17)     |
| [0007](0007-i18n-routing-and-locale-negotiation.md)    | i18n routing; `/` negotiation in a Cloudflare Worker                    | Accepted, amended         |
| [0008](0008-plain-css-with-design-tokens.md)           | Plain CSS + custom-property tokens, no Tailwind                         | Accepted                  |
| [0009](0009-typescript-6-and-node-type-stripping.md)   | TypeScript 6.0 pin; Node type stripping for the server                  | Accepted                  |
| [0010](0010-contact-form-email-delivery.md)            | Contact via the Resend HTTPS API behind a Mailer interface              | Accepted (D-04)           |
| [0011](0011-consent-gated-analytics.md)                | Consent banner; GA4 consent-only; PostHog cookieless on reject          | Accepted (D-03)           |
| [0012](0012-content-security-policy.md)                | CSP: Astro hashed meta + `_headers`/Worker/API headers                  | Accepted, amended         |
| [0013](0013-testing-toolchain.md)                      | Vitest + supertest + Playwright + axe (+ wrangler dev for e2e)          | Accepted                  |
| [0014](0014-hosting-cloudflare-workers-and-railway.md) | Hosting: Cloudflare Workers static assets + Railway API                 | Accepted (D-14)           |
| [0015](0015-phone-number-protection.md)                | Phone number behind a Turnstile-verified reveal; never in the repo      | Accepted (D-24, D-25)     |

Template: [`_template.md`](_template.md).
