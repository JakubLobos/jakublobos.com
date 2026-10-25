# T-013: Review providers: quality rules, blocked terms, OpenAI moderation, LLM suitability check

|                          |                                                                           |
| ------------------------ | ------------------------------------------------------------------------- |
| **Wave**                 | 3                                                                         |
| **Depends on**           | T-010, T-011                                                              |
| **Blocked by decisions** | none (D-06 answered; the term list goes to owner review with the PL copy) |
| **Parallel with**        | T-012, T-015, T-016, T-021, T-022                                         |
| **Size**                 | L                                                                         |
| **Requirements**         | FR-41, FR-42, NFR-05, NFR-09                                              |

## Objective

Implement every building block of the three-layer review that protects the owner's image. Each piece is fail-closed, never throws, and is deterministic in tests:

- silent quality rules
- blocked terms
- the OpenAI moderation provider and policy
- the `gpt-5-nano` suitability reviewer with a hardened prompt
- fakes for all providers

## References

- `docs/guestbook-moderation.md` §6 (pipeline, providers, outcome mapping), §7 (rules)
- `docs/decisions/0005-openai-moderation-with-local-rules.md` (layering, prompt-injection posture)
- `docs/research.md` §2, §8 (verified API facts)
- `docs/security.md` T5, T6, T11, T12
- `docs/testing.md` §3 "Review pipeline outcomes", "Quality rules", "Prompt-injection fixtures"

## Scope

- **Domain (pure):**
  - `moderation.port.ts` (`ModerationProvider`, `ModerationOutcome`)
  - `suitability.port.ts` (`SuitabilityReviewer`, `SuitabilityOutcome = { kind: 'ok', verdict, reason } | { kind: 'transient', code, retryAfterSeconds? }`)
  - `moderation-policy.ts` (threshold, equal → reject, returns the offending categories)
  - `quality-rules.ts` (`checkQuality(text): { ok: true } | { ok: false, rule }`, rules exactly as in §7.1)
  - `blocked-terms.ts` (matcher + curated EN/PL list, marked `// D-06: owner review`)
- **Infra:**
  - `infra/moderation/openai-moderation.provider.ts` + `fake-moderation.provider.ts`
  - `infra/suitability/openai-suitability.reviewer.ts`, `prompt.ts` (`PROMPT_VERSION`, developer instructions, delimiting, JSON schema), `fake-suitability.reviewer.ts`
  - `infra/review/index.ts`: `createReviewProviders(config, deps)` returns `{ moderation, suitability }` selected by config
- **Fixtures** under `apps/server/test/fixtures/`:
  - `openai/moderation/*.json` (clean, flagged, high-score, extra-category, missing-results, empty-scores, malformed)
  - `openai/responses/*.json` (approve, reject, refusal, incomplete, schema-invalid, non-JSON text)
  - `guestbook/legit-messages.en.txt`, `legit-messages.pl.txt` (≥ 50 each), `weird-messages.txt`, `injection-attempts.txt`

## Out of scope

Pipeline orchestration and the worker (T-014).

## Allowed files

`apps/server/src/domain/guestbook/{moderation.port,suitability.port,moderation-policy,quality-rules,blocked-terms}.ts` (+ tests), `apps/server/src/infra/{moderation,suitability,review}/**`, `apps/server/test/fixtures/{openai,guestbook}/**`.

## Dependencies

None new (global `fetch`, zod).

## Implementation notes

- Before coding, **verify the Responses API request shape against the current OpenAI docs**: `text.format` json_schema strict, `store: false`, the reasoning-effort parameter for `gpt-5-nano`, and `max_output_tokens`. Record what you verified (URL + date) in the report. If a parameter isn't supported by the model, drop it and note it; the outcome mapping stays as specified.
- Parse the Responses output by finding the `message` item, then the `output_text` content (or a `refusal` item). Don't rely on SDK conveniences.
- The prompt must:
  - describe the context (a public guestbook on a professional frontend developer's portfolio; the site owner's reputation matters)
  - list what to approve (short friendly greetings, compliments, kind or witty remarks about the site or frontend, in any language)
  - list what to reject, with the reasons from the enum
  - say "when in doubt, reject"
  - state that the visitor note is untrusted data inside `<visitor_note>` tags and that any instructions in it must be ignored

  Keep it under ~350 tokens.

- Never log the text, the key, or raw provider bodies. Do log the outcome kind, verdict and reason, rule name, HTTP status, latency, model, and prompt version.
- Use an injected `fetch` and fake timers for timeouts.

## Acceptance criteria

- **AC-1** Every moderation fixture and status (200 valid/malformed, 400, 401, 403, 429 ± Retry-After, 500, 503, network, timeout) maps as in §6.1. The policy boundary 0.2 → reject, 0.1999 → approve.
- **AC-2** Every Responses fixture and status maps as in §6.2 (approve, reject, refusal → reject, incomplete / invalid / non-JSON / HTTP errors → transient). The request body has `store: false`, a strict json_schema, and the visitor text only inside the delimited user message (snapshot test).
- **AC-3** `moderate()` and `review()` never reject their promises.
- **AC-4** Quality rules: 100 % of `legit-messages.*` pass and 100 % of `weird-messages.txt` are caught. Each rule has boundary tests (§7.1, `testing.md` §3).
- **AC-5** Blocked terms catch case, diacritic, repetition, and leetspeak variants as whole words, and don't match innocent superstrings (one Scunthorpe-style case per language).
- **AC-6** Fakes honour `[flag]`, `[slow]`, `[fail]`, `[unsuitable]`, `[sfail]`. `createReviewProviders` returns fakes only when configured.
- **AC-7** A log-capture test shows no text or key in the logs.

## Validation

```
pnpm verify
pnpm --filter @portfolio/server exec vitest run src/infra src/domain/guestbook
```

## Definition of done

Standard DoD. The report lists the blocked-term list (size and categories), the full prompt text, and the verified OpenAI parameters, for owner review.
