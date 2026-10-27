# T-019 implementation report (round 2)

Status: READY FOR REVIEW

## Findings addressed

1. Moderation is now a JSON-schema classification call (harassment, hate, sexual, dangerous, self_harm, spam; temperature 0; the note is treated as data). `blockReason` or a finishReason of SAFETY/PROHIBITED_CONTENT/BLOCKLIST gives `flagged: true`; any safetyRatings (prompt or candidate) are merged by max. Absent ratings are fine; only a missing or invalid verdict (with no block) is `invalid_response`.
2. Bucket mapping NEGLIGIBLE 0, LOW 0.1, MEDIUM 0.6, HIGH 0.9 (ADR updated).
3. Both adapters send `thinkingConfig: { thinkingLevel: 'minimal' }` and `maxOutputTokens: 512`. The thinking guide lists `minimal` as the lowest level for gemini-3.5-flash-lite (no off switch) but documents the field as `thinking_level` for the Interactions API; the generateContent camelCase form was not confirmed in the docs. ADR follow-up: verify live; a 400 would fail closed.
4. Retention re-checked: the terms say Google "logs prompts and responses for a limited period of time" (paid services), with no number of days; unpaid services state none. Owner placeholder kept.
5. Privacy text simplified (EN+PL).
6. Moderation tests rewritten (classification approve/reject, block/finishReason, ratings merge LOW vs MEDIUM, missing ratings fine, invalid JSON).

## Extra scope (professional-tone rubric)

`PROMPT_VERSION` is `guestbook-suitability-v2` with the new rubric and EN/PL few-shot examples; new reason `low_effort_or_meme` (port, schema, docs 6.2); blocked terms `skibidi` and `6767` (plus tests; the term-shape test now allows digits); prompt snapshot updated; the prompt-budget test cap raised from 350 to 700 tokens for the few-shots.

## Commands

`pnpm verify`: green.
