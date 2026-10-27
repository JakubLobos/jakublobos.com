# T-019: Gemini review providers (free tier)

**Why:** the owner wants the guestbook review to run at zero cost on the Gemini API free tier (Google AI Studio key). OpenAI stays a supported option.

## Scope

- **Verify first:** use WebFetch on the official docs (ai.google.dev) to confirm the current recommended low-cost model for the free tier (a Flash-Lite-class model), the REST `generateContent` request/response shape (`responseMimeType`/`responseSchema` for JSON output, `safetySettings`, `safetyRatings`, `promptFeedback.blockReason`), the free-tier rate-limit status codes, and the **Gemini API Additional Terms data-use rules for unpaid services**, including any special treatment for the EEA/UK/Switzerland. Record what you found, with URLs and the date checked, in the ADR.
- `infra/moderation/gemini-moderation.provider.ts` implements the existing `ModerationProvider` port. Call `generateContent` with `safetySettings` at `BLOCK_NONE`, so you get ratings rather than a hard block. Map them as follows:
  - each harm category's probability → a score (NEGLIGIBLE 0, LOW 0.25, MEDIUM 0.6, HIGH 0.9; adjust only if the docs give better data, and document it);
  - `blockReason` present → `flagged: true`.
  - The existing threshold policy (0.2) then applies unchanged. If the docs show a better-suited approach (e.g. a JSON-schema classification prompt), you may use it instead, as long as it still fills the same port contract; document why in the ADR.
- `infra/suitability/gemini-suitability.reviewer.ts` implements the existing `SuitabilityReviewer` port: same verdict JSON schema and prompt intent as the OpenAI reviewer, via `responseSchema`, temperature 0, and a small `maxOutputTokens`.
- **Both adapters:**
  - use the injected `fetch`, no SDK, no new dependencies;
  - send the key in the `x-goog-api-key` header, never in the URL, because URLs get logged;
  - use `AbortSignal.timeout` with the existing timeout envs;
  - parse responses with zod;
  - use the same status mapping as the OpenAI adapters: 429 → `rate_limited` (+ Retry-After if present), 5xx → `provider_error`, 401/403 → `auth`, other 4xx → `bad_request`, abort → `timeout`, `TypeError` → `network`, invalid body → `invalid_response`. Everything except ok is transient, so the pipeline fails closed.
  - Never log the message body or the key.
- **Config (`config.ts`):**
  - `MODERATION_PROVIDER` and `SUITABILITY_PROVIDER` accept `openai | gemini | fake`;
  - new `GEMINI_API_KEY` (secret, required when either provider is `gemini`) and `GEMINI_MODEL` (default = the verified model);
  - `OPENAI_API_KEY` is required only when a provider is `openai`. `fake` is still refused in production.
  - Wire the composition root.
- **Docs:**
  - a new ADR in `docs/decisions/` (next free number);
  - `docs/guestbook-moderation.md` §6 (add Gemini subsections);
  - `docs/operations.md` (go-live checklist + Railway variables table + key rotation row);
  - `docs/security.md` (processor list / data flows);
  - `.env.example`.
- **Privacy policy:** in `apps/web/src/i18n/messages/privacy.ts`, update the guestbook rows that name OpenAI as the processor so the policy states the configured processor is Google (Gemini API). Base the text strictly on the verified terms: if free-tier content may be used to improve Google's products or be read by human reviewers, say so plainly, in EN **and** PL (informal "Ty", „…” quotes). Update both locales; flag the PL wording for owner review in your report. Keep keys and structure unchanged.

## Allowed files

`apps/server/src/infra/moderation/**`, `apps/server/src/infra/suitability/**`, `apps/server/src/config.ts` (+ test), the server composition root, `apps/web/src/i18n/messages/privacy.ts`, `docs/decisions/**`, `docs/guestbook-moderation.md`, `docs/operations.md`, `docs/security.md`, `.env.example`, `tasks/T-019-gemini-review-provider.md`, `tasks/reports/T-019/**`.

## Acceptance criteria

- AC-1: with `MODERATION_PROVIDER=gemini SUITABILITY_PROVIDER=gemini GEMINI_API_KEY=…`, the server starts, and a guestbook post goes through both Gemini adapters (proven by unit tests with a mocked fetch: approve, moderation reject, suitability reject, every transient mapping).
- AC-2: config tests cover gemini-without-key → startup error, openai-only without the Gemini key → ok, and fake in production → refused.
- AC-3: there are no real network calls in tests; the key is sent only in a header and never logged (a test asserts the URL has no key).
- AC-4: the privacy policy (EN+PL) and the ADR reflect the verified Google data-use terms, with source URLs in the ADR.
