# ADR-0005: Layered guestbook review: local rules → OpenAI moderation → LLM suitability check

- **Status:** Accepted (owner decisions D-06, 2026-10-25); the uniform "in review" modal is amended by [ADR-0017](0017-guestbook-submission-status.md) · **Related:** FR-41…FR-43, T5, `guestbook-moderation.md` §6–§8

## Context

The guestbook is public on a professional portfolio. The owner's requirement is "moderation should take care about my good image and no weird texts". Verified facts (2026-10-25):

- **OpenAI Moderation** (`omni-moderation-latest`) is free, retains no data (no abuse-monitoring retention), and isn't used for training. It covers harm categories only (harassment, hate, illicit, self-harm, sexual, violence…). Profanity, gibberish, ads, self-promotion, politics, and innuendo aren't categories. Scores are "signals for your application's policy". Non-English recall is weaker.
- **Responses API** with strict JSON-schema structured output (`text.format: { type: "json_schema", strict: true, … }`). Refusals arrive as a `refusal` content item. `store: false` avoids the default 30-day application-state retention; abuse-monitoring logs may still be kept up to 30 days for `/v1/responses`.
- **Price:** `gpt-5-nano` costs $0.05 / 1M input and $0.40 / 1M output tokens, so about $0.00003 per check (roughly 400 input + 30 output tokens). Paid API usage requires purchasing credits.

## Decision

Three layers, all of which must pass. Every failure or uncertainty means **not published**.

1. **Deterministic rules** (free, instant, at submission):
   - Feedback rules return 422 so the visitor can fix the text: length, invalid characters, links, contact info.
   - Silent rules drop the message without telling the visitor: quality heuristics (no letters, shouting, character runs, emoji or symbol floods, keyboard mashing, repeated words) and a curated EN/PL blocked-term list.
2. **OpenAI moderation:** reject if `flagged` or if any category score is ≥ `MODERATION_SCORE_THRESHOLD` (default **0.2**, stricter than the earlier 0.3).
3. **Suitability check** (`gpt-5-nano`, env `OPENAI_SUITABILITY_MODEL`): a strict-schema classifier that answers whether this is a friendly, appropriate note for a professional developer's portfolio guestbook. Output is `{ verdict: "approve" | "reject", reason: enum }`. Request settings: `store: false`, minimal reasoning effort, a small output-token cap. A refusal, an incomplete or invalid output, or a `reject` verdict all mean not published.

All providers sit behind ports (`ModerationProvider`, `SuitabilityReviewer`) with deterministic fakes for development and tests. The fakes are refused in production.

**Prompt-injection posture:** the visitor's text is passed as delimited data with explicit instructions never to follow it. The output is constrained by a strict schema, so the only possible outputs are approve or reject with a reason. The classifier can only _add_ rejections, never bypass layers 1–2, so a successful injection can at worst approve a message that already passed rules and moderation.

## Alternatives considered

| Option                                    | Why not                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Moderation + rules only                   | The owner chose the stronger check; rules alone miss polite ads, innuendo, political statements, and subtle gibberish          |
| Manual approval by email link             | Strongest control, but adds latency, an auth surface, and more to build; the owner chose automation                            |
| Bigger model (`gpt-5-mini`)               | ~5× the cost with no clear need for a yes/no classification of 120 characters; the model is an env setting and can be upgraded |
| Suitability check _instead of_ moderation | Moderation is free and specialized; keep defense in depth                                                                      |

## Consequences

- Owner actions: an OpenAI project with credits (minimum $5) and a monthly budget limit.
- At most one pending message (ADR-0006) plus global caps bound spend to under 50 classifications a day.
- Message text is processed by OpenAI's `/v1/responses` endpoint, which may keep abuse-monitoring logs for up to 30 days. This is disclosed in the privacy policy (T-033).
- False positives (a harmless note not shown) are acceptable by design; the owner's image takes priority.
- Revisit if OpenAI pricing or terms change, or if the reject rate looks wrong in the logs (reasons are logged, never text).

## Sources (accessed 2026-10-25)

- https://developers.openai.com/api/docs/guides/moderation
- https://developers.openai.com/api/docs/pricing
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/your-data
- https://openai.com/index/upgrading-the-moderation-api-with-our-new-multimodal-moderation-model/
- https://portkey.ai/blog/openai-omni-moderation-latest-benchmark/
