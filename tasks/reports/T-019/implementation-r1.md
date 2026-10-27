# T-019 implementation report (round 1)

Status: READY FOR REVIEW

## Summary

Gemini moderation and suitability adapters behind the existing ports; config accepts `openai | gemini | fake`; composition root wired; ADR-0016, docs, `.env.example` and the privacy policy (EN+PL) updated.

## Verified Google facts (2026-10-27; URLs in ADR-0016)

- Model: `gemini-3.5-flash-lite` (free of charge on the Free tier per the pricing page). Default of `GEMINI_MODEL`.
- Data use, unpaid services (https://ai.google.dev/gemini-api/terms): content may be used to improve Google products; human reviewers may read it; EEA/Switzerland/UK customers get the paid-service data terms for unpaid quota too.
- Free-tier 429 `RESOURCE_EXHAUSTED`; no Retry-After documented (honoured if present).

## Acceptance criteria

- AC-1: `gemini-suitability.reviewer.test.ts`, `gemini-moderation.provider.test.ts` (approve, reject, block, every transient mapping); `infra/review/index.test.ts` wires both adapters.
- AC-2: `config.test.ts` "loadConfig (Gemini)": gemini without key errors, openai-only without Gemini key ok, production with Gemini and no OpenAI key ok, fake still refused.
- AC-3: mocked fetch only; tests assert the URL has no key, the key is in `x-goog-api-key`, and logs hold neither key nor text.
- AC-4: privacy.ts EN+PL, ADR-0016 with sources.

## Commands

- `pnpm verify`: green (format, lint, typecheck, test, build, budgets "Budgets OK").

## Design notes and assumptions

- Score mapping: NEGLIGIBLE 0, LOW 0.25, MEDIUM 0.6, HIGH 0.9 (own values; the docs give no numbers). `blockReason` gives `flagged: true` plus a `prompt_blocked` category.
- Moderation reads `promptFeedback.safetyRatings` (ratings of the prompt); missing ratings or an unknown bucket is `invalid_response` (fail closed).
- Change Request note: `postJson` in `infra/review/http.ts` gained an optional `keyHeader`, and `infra/review/index.ts` is the composition root. Both sit outside the listed globs but are the shared transport and root the task requires.
- Production no longer requires `OPENAI_API_KEY` unconditionally; it is required only when a provider is `openai`.

## Open issues

- Not live-tested (no key): confirm `BLOCK_NONE` is accepted by the model (the docs fetched named the off setting `off`), that `promptFeedback.safetyRatings` is populated, and that thinking tokens do not exhaust `maxOutputTokens: 256`.
- Google's retention period was not verified; privacy rows carry `[OWNER: confirm retention]` / `[WŁAŚCICIEL: ...]` placeholders.
- The generate-content reference was read only for the first 100k of 175k characters.

## PL wording for owner review

`apps/web/src/i18n/messages/privacy.ts`: two guestbook table rows, the automated-decision sentence and the "Google (Gemini API)" section (replacing the OpenAI h3). Informal "Ty" used.
