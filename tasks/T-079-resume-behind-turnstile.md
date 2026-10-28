# T-079: Resume download behind human verification

- **Wave:** 8 (go-live) · **Size:** M · **Depends on:** T-016/T-031 (phone reveal, ADR-0015), T-024 (hero)
- **Owner decision (2026-10-28, D-35):** the resume PDF contains the owner's phone number. A static `/resume/*.pdf` file would let any scraper bypass the phone protection of ADR-0015.
  - The resume is served by the API, behind the same Cloudflare Turnstile check as the phone reveal.
  - **The PDF never enters the repository, the site build or the Docker image.** AGENTS.md rule 5 forbids the real phone number anywhere in the repo.

## Behaviour

- The hero "Get my resume" / "Pobierz moje CV" control keeps its current look. Activating it runs a Turnstile challenge, the same way "Show number" does: usually invisible, interactive only when Cloudflare asks. It then calls the API and the browser downloads the PDF.
  - Download mechanism: fetch into a Blob, create an object URL, click a temporary `<a download>`, then revoke the URL.
  - Downloaded filename: always `Jakub_Lobos_CV.pdf`. **One English CV is served for both locales** (owner scope change); only the button labels are localized.
- Busy, failure, rate-limited and unavailable states mirror the phone reveal. Use EN + PL messages in the hero message module, polite live-region announcements, and keep the control usable for a retry.
  - The status text must not shift the hero layout (T-063 rule: reserve space, or place it so nothing below moves).
- **No JS:** the phone reveal shows a no-script note. Do the equivalent here, e.g. a short "Enable JavaScript to download, or email me" note with the mailto link. Keep the design intact.

## API

- `POST /api/resume`, JSON body `{ turnstileToken: string }`.
  - Add a zod schema in `packages/contracts/src/schemas` and a runtime-light type in the index, following `PhoneRevealRequestSchema`.
- Route `apps/server/src/http/routes/resume.routes.ts`, modelled on `phone.routes.ts`:
  - per-IP limiters and a daily global cap: separate instances, same numbers as the phone route unless you have a reason;
  - `jsonBody('4kb')`;
  - the same 422, 403 and 503 handling;
  - Turnstile `expectedAction: 'download-resume'`;
  - the same verifier port.
- Success: `200` with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="…"`, `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` (if not already global). The body is the raw file.
  - Errors keep the standard JSON envelope.
  - If an error code like `RESUME_UNAVAILABLE` is new, add it to contracts and `docs/api.md`.
- **Storage port:** the domain gets a port (e.g. `ResumeStore.read()`). The infra adapter `infra/resume/` reads from a directory set by config.
  - One file, `<RESUME_DIR>/cv.pdf`. No per-locale lookup and no fallback.
  - Reject anything that doesn't start with `%PDF-` or is over 5 MB: log a warning without the path contents, and answer 503.
  - Missing file: 503 with a `retryAfterSeconds`, the same as an unset `CONTACT_PHONE`, plus a server error log.
- **Config:** add `RESUME_DIR` (zod, in `config.ts`).
  - Production default: `/data/resume` on the existing Railway volume. Set it in the Dockerfile like `DATABASE_PATH` if that is the pattern.
  - Dev default: a gitignored local directory such as `.data/resume`, matching where the dev database lives.
  - Document it in `.env.example` and `docs/operations.md` §3.
- Tests (`*.test.ts`, deterministic, the fake verifier, a temp dir):
  - success headers and body;
  - missing file → 503;
  - non-PDF → 503;
  - verifier rejected → 403;
  - unavailable → 503;
  - validation → 422;
  - per-IP limit → 429.

  Keep them as lean as the phone route tests.

## Frontend

- **Extract the Turnstile loading and challenge code** from `scripts/phone-reveal.ts` into a shared module, e.g. `scripts/turnstile.ts`. Phone reveal and resume download both use it, and phone reveal's behaviour doesn't change.
- Resume download is a small custom element in its own script, e.g. `scripts/resume-download.ts`. Follow the phone-reveal structure and the site-key handling from `ContactDetails.astro`: an empty `PUBLIC_TURNSTILE_SITE_KEY` switches to the fake flow in local dev.
- The fetch helper goes in `lib/api/` next to `phone.ts`. Pure logic stays DOM-free in `lib/`.
- `content/profile.ts`: remove the static `resume` paths and update every user (Hero, `dev/showcase.astro`).
- CSP: no change should be needed (the API origin is already in `connect-src`, and blob downloads via `<a download>` aren't CSP-restricted). Verify on the built site that the browser console shows no CSP violations.

## Repo hygiene and docs

- `.gitignore`: add `/*.pdf` (repo root) and the local resume directory. The owner has `Jakub_Lobos_CV.pdf` untracked in the root. **Never read, copy, commit or upload that file.** Use a generated dummy PDF for tests and the local check (a minimal `%PDF-` file with no real data).
- `tools/check-release-assets.mjs`: drop the static resume PDF check, since the PDFs are no longer site assets.
- **New ADR** `docs/decisions/0018-resume-behind-human-verification.md`, short, referencing ADR-0015. Update `docs/api.md`, `docs/security.md` (threat or data rows if affected) and `docs/architecture.md` if it lists endpoints.
- `docs/operations.md`: add a section on uploading and replacing the resume on the Railway volume.
  - Research how to get a local file onto a Railway volume (Railway docs, e.g. whether `railway ssh` accepts stdin, or another documented way).
  - Document one concrete, verified-as-far-as-possible procedure, and say clearly what you couldn't verify. If no clean way exists, propose the smallest alternative in the report instead of building it.
- Privacy policy (`i18n/messages/privacy.ts`, EN + PL): the Turnstile row must say it also loads before a resume download (purpose and "Where" cells).
  - **Edit only those cells.** PR #30 (draft) edits other cells of the same file.
  - Set `PRIVACY_LAST_UPDATED` only if it isn't already `2026-10-28` on main.
- `docs/decisions/open-questions.md`: D-35 row.
- Regenerate `docs/content/pl-copy-review.md` with `node tools/i18n/export-copy.ts`, then run prettier.
- Commit this spec as `tasks/T-079-resume-behind-turnstile.md`, prettier-formatted.

## Allowed files

Everything named above, plus new files under `apps/server/src/{domain,infra,http/routes}` for this feature, the server wiring in `app.ts`/`main.ts`, `apps/server/Dockerfile` (env default only), and e2e specs that reference the old resume link.

## Acceptance criteria

1. Clicking "Get my resume" on the built site, with the dev or fake verifier, downloads the PDF from the API. No static `/resume/*.pdf` exists in `dist/`.
2. Without a valid token the API returns 403; without a file, 503. The rate limit works.
3. Phone reveal works exactly as before, now using the shared Turnstile module.
4. No PDF from the owner is in git: `git ls-files '*.pdf'` shows none at the root, and the dummy lives only in tests or temp.
5. EN + PL copy; axe clean on the hero; no layout shift from the status text.
6. `pnpm verify` green.

## Validation

- `pnpm verify`.
- Throwaway Playwright script (not committed) against the built site. Use `pnpm --filter @portfolio/web build`, then `astro preview --port 4415`, plus the API with dev config on a free port **other than 3000**, e.g. `PORT=3415`.
  - The site build must point at that API: check how `PUBLIC_API_BASE_URL` and the preview proxy work and pick the least invasive way.
  - **Use ports 4415 and 3415 only.** The owner runs `pnpm dev` on 3000/4321; kill only PIDs you started.
  - Click the hero button, then assert that a download event fires with the right filename and `%PDF-` content.
  - Check the phone reveal still works.
  - Run axe on the hero.
- Don't run `pnpm test:e2e`.
