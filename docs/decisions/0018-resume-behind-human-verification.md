# ADR-0018: The resume PDF is served by the API behind Turnstile; it is never a static asset

- **Status:** Accepted (owner decision D-35, 2026-10-28) · **Related:** ADR-0015, `security.md` T20

## Context

The owner's resume contains their phone number. A static `/resume/*.pdf` on the site would let any scraper fetch the number without the Turnstile check that ADR-0015 puts in front of the phone reveal. AGENTS.md rule 5 also forbids the real number anywhere in the repository, so the PDF can't be committed or built into the site or the Docker image.

## Decision

- **One English CV for both site locales.** The hero button label stays localized; the file does not.
- **Storage:** `<RESUME_DIR>/cv.pdf` on the Railway volume (`RESUME_DIR=/data/resume` in the image; `./data/resume` in development, which is git-ignored). The owner uploads it by hand (`operations.md` §3.1). It is not in git, the site build or the image. `/*.pdf` is git-ignored at the repository root as a guard.
- **Endpoint:** `POST /api/resume` with `{ turnstileToken }`. It reuses the phone route's flow: per-client limits (5 / 10 min, 20 / 24 h), a global cap (300 / 24 h) held in separate instances, and `siteverify` with `action === 'download-resume'`. Success is the raw PDF (`application/pdf`, `Content-Disposition: attachment; filename="Jakub_Lobos_CV.pdf"`, `Cache-Control: no-store`).
- **Fail closed:** a missing file, a file that doesn't start with `%PDF-`, or one over 5 MB answers `503 RESUME_UNAVAILABLE` with `Retry-After`. The server logs an error or warning without the path.
- **Frontend:** the hero control runs the same Turnstile flow as "Show number" (shared `scripts/turnstile.ts`), fetches the PDF as a Blob and saves it through a temporary `<a download>`. Without JavaScript the hero shows a note with the mailto link.

## Consequences

- Every download costs a Turnstile challenge (usually invisible) and one API request; the privacy policy's Turnstile row now also names the resume download.
- The resume must be uploaded to the volume before go-live (owner action). Until then the button answers with an "unavailable" message.
- The release check no longer expects PDFs in `dist/`.
- A scraper that solves Turnstile can still get the file, as with the phone number; the limits bound the volume.
