# T-019 review, round 2 (orchestrator)

**Verdict: APPROVED, pending one live check with the owner's key (R2-01).**

Round 1 (in conversation) raised two MAJOR items: moderation depended on `promptFeedback.safetyRatings`, which newer models often leave empty (so nothing would ever publish), and LOW mapped to 0.25, which rejected harmless text. Both are fixed: moderation is now a JSON-schema classification call, blocks and safety finish reasons set `flagged`, ratings merge when present, and the buckets are NEGLIGIBLE 0 / LOW 0.1 / MEDIUM 0.6 / HIGH 0.9.

## Checks

- `pnpm verify`: green (implementer). Key only in the `x-goog-api-key` header; logs carry outcome, status, latency and model only. Tests mock `fetch`, no network.
- Owner's tone rubric: `guestbook-suitability-v2` with EN/PL few-shots, new reason `low_effort_or_meme`, blocked terms `skibidi`/`6767`. The prompt is provider-neutral and shared by OpenAI and Gemini.
- CRs accepted: `infra/review/http.ts` (`keyHeader`), `infra/review/index.ts` (composition root), the prompt-size test cap raised to 700 tokens, the blocked-terms shape test allowing digits.

## Findings

- R2-01 LIVE CHECK (owner key): `thinkingConfig.thinkingLevel: 'minimal'` and `BLOCK_NONE` aren't confirmed against the live API. A 400 fails closed (nothing publishes), so post one normal and one meme note with `MODERATION_PROVIDER=gemini SUITABILITY_PROVIDER=gemini` before go-live.
- R2-02 OWNER: Google states no retention period for abuse logging, so the `[OWNER/WŁAŚCICIEL: …]` placeholder stays. Also review the PL privacy text, in particular whether to keep "nie ponosimy opłat", which reads oddly in a privacy policy.
