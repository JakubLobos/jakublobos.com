# ADR-0016: Gemini free-tier review providers alongside OpenAI

- **Status:** Accepted
- **Date:** 2026-10-27
- **Related:** T-019, ADR-0005 (OpenAI moderation), `docs/guestbook-moderation.md` §6, `docs/security.md`

## Context

The owner wants the guestbook review to cost nothing, using the Gemini API free tier (Google AI Studio key). OpenAI remains supported. Facts verified on the official docs, checked 2026-10-27:

- **Model:** the models page recommends `gemini-3.5-flash-lite` as the most cost-effective current model. The pricing page lists it as "Free of charge" on the Free tier. Default `GEMINI_MODEL=gemini-3.5-flash-lite`.
- **Request shape:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with `contents`, `systemInstruction`, `generationConfig` (`temperature`, `maxOutputTokens`, `responseMimeType`, `responseSchema`) and `safetySettings[]` (`category`, `threshold`). The REST example in the safety-settings guide sends the key in the `x-goog-api-key` header. The generate-content reference shows `?key=` in the URL, which we avoid because URLs are logged.
- **Response shape:** `candidates[].finishReason`, `candidates[].content.parts[].text`, `promptFeedback.blockReason` (`SAFETY`, `OTHER`, `BLOCKLIST`, `PROHIBITED_CONTENT`, `IMAGE_SAFETY`) and `promptFeedback.safetyRatings[]` (one rating per category, rating the prompt). Probability buckets are negligible / low / medium / high. The docs say a block yields no candidates.
- **Safety thresholds:** the reference examples show `BLOCK_MEDIUM_AND_ABOVE` and `BLOCK_ONLY_HIGH`; the safety-settings guide names the no-filter setting `off`. We send `BLOCK_NONE` as the task specified; this is the long-standing REST enum value and was not contradicted, but it was **not re-confirmed in the docs fetched** (see Follow-ups).
- **Rate limits:** `429 RESOURCE_EXHAUSTED` is documented for spend limits. Free-tier RPM/RPD figures are only visible in AI Studio. No `Retry-After` header is documented; we honour it if present.
- **Data use, unpaid services** (Gemini API Additional Terms): Google "uses the content you submit to the Services and any generated responses to provide, improve" and develop its products and machine-learning technologies; "human reviewers may read, annotate, and process your API input and output" (disconnected from the Google Account, API key and Cloud project first); the terms advise against sending sensitive, confidential or personal information. The pricing page shows "Used to improve our products: Yes" for the Free tier and "No" for Paid. **EEA, Switzerland and UK:** the terms say that for customers in those regions the paid-service data terms apply to all services, including Google AI Studio and unpaid quota in the Gemini API. The owner operates from Poland (EEA), so the paid-service rules should apply to this key. The terms text does not state precisely which party's location counts, so the privacy policy states both rules.

## Decision

Add `GeminiModerationProvider` and `GeminiSuitabilityReviewer` behind the existing ports, selected per port by `MODERATION_PROVIDER` / `SUITABILITY_PROVIDER` (`openai | gemini | fake`). Injected `fetch`, no SDK, no new dependency. The key travels in `x-goog-api-key`; a test asserts it is never in the URL or the logs. Error mapping is identical to the OpenAI adapters (shared `postJson`, which gained an optional `keyHeader`). Everything except `ok` is transient, so the pipeline still fails closed.

**Moderation** uses the prompt-level `promptFeedback.safetyRatings` with all four categories at `BLOCK_NONE`. Probability to score: NEGLIGIBLE 0, LOW 0.25, MEDIUM 0.6, HIGH 0.9, so the unchanged 0.2 threshold rejects LOW and above. The docs give no numeric data, so the bucket values are our own. `blockReason` present adds a `prompt_blocked` category and `flagged: true`. Ratings missing, or an unknown bucket (for example `HARM_PROBABILITY_UNSPECIFIED`), is `invalid_response`, never clean. The generation is capped at one output token because only the prompt ratings are used.

**Suitability** reuses the OpenAI prompt (`PROMPT_VERSION`) as `systemInstruction`, with `responseMimeType: application/json`, a typed-enum `responseSchema`, `temperature: 0`, `maxOutputTokens: 256`. `finishReason: MAX_TOKENS` is `incomplete`; a prompt block or safety stop is a reject (`other`), matching an OpenAI refusal; an approve with a rejection reason is rewritten to reject.

A JSON-schema classification prompt for moderation was considered and rejected for now: the safety ratings are a purpose-built classifier, cost no extra call, and fill the port with no prompt to maintain.

## Alternatives considered

| Option                                   | Pros                       | Cons                                                 | Why not                              |
| ---------------------------------------- | -------------------------- | ---------------------------------------------------- | ------------------------------------ |
| Stay on OpenAI only                      | Verified, strong retention | Costs money; owner wants zero cost                   | Kept as an option, not the only one  |
| Gemini via official SDK                  | Less hand-written code     | New dependency, conflicts with the approved-dep rule | `fetch` is enough                    |
| LLM classification prompt for moderation | Tunable categories         | A second prompt, nondeterminism, token use           | Safety ratings already fill the port |

## Consequences

- Free-tier quota exhaustion returns 429, so posts go to the retry path; nothing is published without review.
- Outside the EEA/UK/Switzerland, free-tier content may be used to improve Google products and be read by human reviewers. The privacy policy says so (EN + PL) and the owner should be comfortable with that before using the free tier.
- Follow-ups for the first live check: confirm `BLOCK_NONE` is accepted by `gemini-3.5-flash-lite` (otherwise switch to `OFF`), confirm that `promptFeedback.safetyRatings` is populated for an ordinary prompt (otherwise moderation fails closed with `invalid_response`), and confirm the model does not spend `maxOutputTokens` on thinking.
- Revisit if Google changes the free-tier terms, retires the model, or if Retry-After becomes documented.

## Sources

- https://ai.google.dev/gemini-api/docs/models (2026-10-27)
- https://ai.google.dev/api/generate-content (2026-10-27; only the first 100 000 characters were read)
- https://ai.google.dev/gemini-api/docs/safety-settings (2026-10-27)
- https://ai.google.dev/gemini-api/docs/rate-limits (2026-10-27)
- https://ai.google.dev/gemini-api/docs/pricing (2026-10-27)
- https://ai.google.dev/gemini-api/terms (2026-10-27)
