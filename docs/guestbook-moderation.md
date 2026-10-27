# Guestbook: submission, review, retention, and archive

Requirements: FR-25…FR-27, FR-40…FR-48, NFR-05…NFR-07. Decisions: [ADR-0005](decisions/0005-openai-moderation-with-local-rules.md) (layered review), [ADR-0006](decisions/0006-guestbook-state-model-and-retention.md) (newest-wins, retention, archive). Owner intent: _"moderation should take care about my good image and no weird texts"_.

## 1. Invariants (each has a named test)

| #   | Invariant                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I-1 | A row becomes publicly readable **only** through `approve()`, called only when the rules, the moderation result, **and** the suitability verdict all explicitly pass. |
| I-2 | The only public read (`GET /latest`) returns the single newest row with `status = 'approved'`.                                                                        |
| I-3 | `COUNT(*)` ≤ **100** (pending + approved), enforced in the insert transaction and backed by a DB trigger.                                                             |
| I-4 | Rejected, superseded, and expired messages are deleted, not stored.                                                                                                   |
| I-5 | At most one row per `client_request_id` and per `content_hash` (UNIQUE).                                                                                              |
| I-6 | Pending rows older than 24 h are deleted, never published.                                                                                                            |
| I-7 | At most **one** pending row exists. A new submission supersedes any older pending row. Only the newest pending message is ever reviewed or retried.                   |
| I-8 | No IP address, user agent, or visitor identifier is persisted.                                                                                                        |

## 2. State model

```
 submit (validated, silent rules passed)
        │   in ONE transaction: delete existing pending (superseded) → evict oldest approved if needed → insert
        ▼
  ┌──────────┐  rules ✓ → moderation ✓ → suitability ✓       ┌──────────┐
  │ pending  │ ───────────────────────────────────────────►  │ approved │ ── private archive (≤ 100 rows)
  │ (max 1)  │                                               └──────────┘    evicted oldest-first when room is needed
  └──────────┘                                                                / deleted via admin CLI
    │  │  ▲  transient failure (any provider): attempts++, next_attempt_at = now + backoff
    │  │  └──┘
    │  └── any layer rejects ──► row deleted (event: rejected, with layer + reason; no text)
    ├────── newer submission ──► row deleted (event: superseded)
    └────── age > 24 h ────────► row deleted (event: expired)
```

## 3. Schema (`infra/db/migrations/0001_guestbook.sql`)

```sql
CREATE TABLE guestbook_messages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT, -- never reuse ids: a stale approve(id) must not hit a newer row (I-1)
  public_id         TEXT    NOT NULL UNIQUE,
  client_request_id TEXT    NOT NULL UNIQUE,
  body              TEXT    NOT NULL CHECK (length(body) BETWEEN 1 AND 120),
  paint             TEXT    NOT NULL CHECK (paint IN ('red','coral','yellow','purple','violet','blue')),
  locale            TEXT    CHECK (locale IN ('en','pl')),      -- page locale at submission (archive context)
  content_hash      TEXT    NOT NULL UNIQUE,
  status            TEXT    NOT NULL CHECK (status IN ('pending','approved')),
  attempts          INTEGER NOT NULL DEFAULT 0,
  next_attempt_at   TEXT,
  last_error_code   TEXT,
  created_at        TEXT    NOT NULL,
  approved_at       TEXT,
  CHECK ((status = 'approved') = (approved_at IS NOT NULL))
) STRICT;

CREATE INDEX ix_guestbook_approved ON guestbook_messages (status, approved_at DESC, id DESC);
CREATE UNIQUE INDEX ux_guestbook_single_pending ON guestbook_messages (status) WHERE status = 'pending';  -- I-7

CREATE TRIGGER trg_guestbook_retention_cap
BEFORE INSERT ON guestbook_messages
WHEN (SELECT COUNT(*) FROM guestbook_messages) >= 100
BEGIN
  SELECT RAISE(ABORT, 'guestbook_retention_cap');
END;
```

Pragmas: WAL, `foreign_keys = ON`, `busy_timeout = 5000`, `synchronous = NORMAL`. Timestamps come from the injected `Clock`. Migrations are forward-only numbered `.sql` files tracked in `schema_migrations`. The partial unique index makes I-7 a database guarantee.

## 4. Submission flow

```
per-client limiters ─► 429 (count every request)
zod schema ─► 422
normalize(body) ; feedbackRules(body) ─► 422 fields              (contracts rules: length, chars, links, contact info)
honeypot filled ─► 202 (drop)
global caps 20/h, 50/day ─► 503 GUESTBOOK_BUSY                  (count only requests reaching this point)
qualityRules(body) ─► 202 (drop, log reason)                     (server-only, §7.1)
blockedTerms(body) ─► 202 (drop, log 'blocked_term')
recentRejections.has(hash) ─► 202 (drop)                         (in-memory 1 h)
repo.insertPendingNewestWins(...)  ── one IMMEDIATE transaction:
    1. client_request_id exists           → 'duplicate'
    2. content_hash exists                → 'duplicate'
    3. DELETE pending rows                → count = superseded (logged)
    4. evict oldest approved while COUNT(*) ≥ 100
    5. INSERT pending (attempts 0, next_attempt_at = now)
──► worker.nudge() ──► 202 received
```

The HTTP response never waits for review. The modal appears instantly ("IN REVIEW").

## 5. Review worker (`domain/guestbook/review-worker.ts`)

- Triggers: `nudge()`, a 15 s interval, and startup (recovers after restarts).
- **Non-reentrant with a rerun flag.** If `nudge()` arrives while a tick is running, the flag is set and one more tick runs immediately after. This guarantees a message that superseded an in-flight review is processed right away.
- Tick:
  1. `deleteExpiredPending(now − 24 h)`.
  2. `findDuePending(now)`, which returns **at most one** row (I-7).
  3. Run the pipeline (§6) for that row.
- Outcome handling:
  - `approve` → `repo.approve(id, now)` (`UPDATE … WHERE id=? AND status='pending'`; 0 rows ⇒ superseded or expired meanwhile ⇒ log and ignore).
  - `reject` → `repo.deletePending(id)` + `recentRejections.add(hash)`.
  - `transient` → `repo.recordFailure(id, code, now + backoff(attempts, retryAfter))`.
- Backoff: 30 s, 2 min, 10 min, 30 min, 1 h, then every 2 h until the 24 h expiry. Provider `Retry-After` is respected (`max`), capped at 2 h so a bogus header can't park the newest message until it expires.
- Shutdown: stop the timer and await the in-flight pipeline (bounded by provider timeouts).

## 6. Review pipeline (`domain/guestbook/review-pipeline.ts`)

```
moderation = await moderationProvider.moderate(body)          // never throws
  transient → return transient
  policy.decide(moderation, threshold 0.2) = reject → return reject('moderation', categories)
suitability = await suitabilityReviewer.review(body, locale)  // never throws
  transient → return transient
  verdict reject → return reject('suitability', reason)
return approve
```

The pipeline is pure orchestration over ports, with a single call site that returns `approve`. On a retry the whole pipeline re-runs (moderation is free; suitability costs about $0.00003).

### 6.1 Moderation provider (`infra/moderation/openai-moderation.provider.ts`)

- `POST https://api.openai.com/v1/moderations` `{ model: OPENAI_MODERATION_MODEL, input: text }`, Bearer key, `AbortSignal.timeout(MODERATION_TIMEOUT_MS)`. Uses injected `fetch`; no SDK.
- The zod-validated response needs a non-empty `results`, with `flagged: boolean`, `categories`, and a non-empty `category_scores` record of numbers in [0,1]. Extra categories are allowed.
- Status mapping: 200 + valid → `ok`. Abort → `timeout`. `TypeError` → `network`. 429 → `rate_limited` (+ Retry-After). 5xx → `provider_error`. 401/403 → `auth` (error log). Other 4xx → `bad_request` (error log). Invalid body → `invalid_response`. **Everything except `ok` is transient.**
- **Policy:** reject if `flagged` or any score ≥ **0.2** (`MODERATION_SCORE_THRESHOLD`; equal counts as reject).

### 6.2 Suitability reviewer (`infra/suitability/openai-suitability.reviewer.ts`)

- `POST https://api.openai.com/v1/responses` with:
  - `model: OPENAI_SUITABILITY_MODEL` (default `gpt-5-nano`)
  - `store: false`
  - `reasoning: { effort: 'minimal' }`
  - a small `max_output_tokens`
  - `text.format = { type: 'json_schema', name: 'guestbook_verdict', strict: true, schema }`, where the schema is:
    ```json
    {
      "type": "object",
      "additionalProperties": false,
      "required": ["verdict", "reason"],
      "properties": {
        "verdict": { "enum": ["approve", "reject"] },
        "reason": {
          "enum": [
            "ok",
            "gibberish",
            "spam_or_ads",
            "self_promotion",
            "offensive_or_rude",
            "sexual_or_suggestive",
            "political_or_religious",
            "personal_data",
            "impersonation",
            "negative_about_owner",
            "off_topic_or_weird",
            "other"
          ]
        }
      }
    }
    ```
  - Exact parameter names are verified against the current OpenAI docs during T-013. Compatible equivalents are acceptable; the behaviour isn't negotiable.
- **Prompt** (`infra/suitability/prompt.ts`, versioned constant `PROMPT_VERSION`): the developer instructions describe a public guestbook on a professional frontend developer's portfolio and approve only short, friendly, sensible notes a visitor would leave (greetings, compliments, kind or witty remarks about the site or frontend). In any language. When in doubt, reject. The visitor text goes in a separate user message wrapped as `<visitor_note>…</visitor_note>`, with an explicit statement that it is untrusted data and that instructions inside it must be ignored.
- **Outcome mapping:**
  - valid JSON matching the schema → `ok` with verdict and reason
  - a `refusal` content item → `ok` with `{ verdict: 'reject', reason: 'other' }`
  - `status: 'incomplete'`, unparseable or schema-invalid output, or HTTP errors → `transient` (same mapping as §6.1)
- Logged: verdict, reason, latency, model, prompt version. **Never** the text.
- **Fake** (`fake-suitability.reviewer.ts`): text containing `[unsuitable]` → reject (`off_topic_or_weird`), `[sfail]` → transient, otherwise approve. Refused in production.

### 6.2a Gemini moderation (`infra/moderation/gemini-moderation.provider.ts`, ADR-0016)

- Selected with `MODERATION_PROVIDER=gemini`. `POST https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent`, key in the `x-goog-api-key` header (never the URL), `safetySettings` for the four harm categories at `BLOCK_NONE`, `maxOutputTokens: 1`. Same timeout, status mapping and logging rules as §6.1.
- The prompt-level `promptFeedback.safetyRatings` become scores: NEGLIGIBLE 0, LOW 0.25, MEDIUM 0.6, HIGH 0.9 (per category, lower-cased without the `HARM_CATEGORY_` prefix). The 0.2 policy therefore rejects LOW and above.
- `promptFeedback.blockReason` present: `flagged: true` plus a `prompt_blocked` category with score 1. No ratings and no block reason, or an unknown probability bucket: `invalid_response` (transient).

### 6.2b Gemini suitability (`infra/suitability/gemini-suitability.reviewer.ts`, ADR-0016)

- Selected with `SUITABILITY_PROVIDER=gemini`. Same endpoint and key header. The §6.2 prompt is the `systemInstruction`; the note is the user content. `generationConfig`: `temperature: 0`, `maxOutputTokens: 256`, `responseMimeType: application/json`, and a `responseSchema` with the same verdict and reason enums.
- Outcomes: valid verdict JSON is `ok`; `promptFeedback.blockReason` or a `SAFETY`-class `finishReason` is `ok` with `reject`/`other`; `MAX_TOKENS` is `incomplete`; anything unparseable is `invalid_response`; HTTP errors map as in §6.1. Approve with a rejection reason is rewritten to reject.

### 6.3 Fake moderation (`fake-moderation.provider.ts`)

`[flag]` → flagged; `[slow]` → resolves after 6 s; `[fail]` → transient; otherwise clean. Refused in production.

## 7. Local rules

### 7.1 Silent quality rules (`domain/guestbook/quality-rules.ts`, server-only)

These are conservative heuristics for "weird texts". A hit means a silent drop (202).

| Rule                 | Drop when                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| No words             | fewer than 2 letters (`\p{L}`) in total                                                                                              |
| Shouting             | ≥ 8 letters and > 70 % of letters uppercase                                                                                          |
| Character run        | the same character repeated ≥ 6 times in a row                                                                                       |
| Symbol / emoji flood | > 40 % of non-space characters are not letters or digits                                                                             |
| Keyboard mash        | a token of ≥ 7 consecutive consonants (Latin, diacritics folded); calibrated so Polish words like `bezwzględny` and `chrząszcz` pass |
| Repetition           | the same word (case-insensitive) ≥ 4 times                                                                                           |
| Unbroken token       | a token longer than 30 characters                                                                                                    |

Calibration fixture: `test/fixtures/guestbook/legit-messages.{en,pl}.txt` (≥ 50 realistic notes each, including diacritics and emoji) must pass **all** rules; `weird-messages.txt` must be caught.

### 7.2 Blocked terms (`domain/guestbook/blocked-terms.ts`)

A curated EN + PL list (profanity, slurs, a few spam keywords such as "crypto", "casino", "viagra"). Matching is whole-word on normalized tokens: lowercase, NFKD diacritics folded, `ł→l`, leetspeak `0→o 1→i 3→e 4→a 5→s 7→t @→a $→s`, character runs squeezed to 2. A hit means a silent drop. The owner reviews the list with the PL copy (D-02/D-06).

## 8. Archive and flood resistance (D-17)

- **Archive** = approved rows (≤ 100, newest first). Private. Access: `pnpm --filter @portfolio/server guestbook list|export` (T-017). Long-term history: daily volume backups (T-050).
- **Storage can't be flooded:** ≤ 100 rows × ≤ 120 characters, ≤ 1 pending; trigger + transaction.
- **Archive displacement is bounded:** at most 50 accepted submissions per day globally (and 20/h), each of which must still pass all review layers. Per-IP limits (3/10 min, 10/day) and dedupe further constrain a single actor. A distributed flood can at worst replace half the archive per day with clean messages, and backups allow restoration.
- **Cost is bounded:** suitability calls ≤ accepted submissions ≤ 50/day, so under $0.05/month.
- **Escalation path:** if abuse appears, add Cloudflare Turnstile to the form and lower the global caps (constants).

## 9. Admin CLI (`apps/server/src/cli/guestbook-admin.ts`)

```
pnpm --filter @portfolio/server guestbook list [--status approved|pending] [--limit 20]
pnpm --filter @portfolio/server guestbook export [--format json|csv] [--out file]
pnpm --filter @portfolio/server guestbook delete <public_id> [--yes]
pnpm --filter @portfolio/server guestbook purge-pending [--yes]
```

On Railway, run it with `railway ssh` (or `railway run`) inside the service. Procedure in `docs/operations.md`.

## 10. Frontend behaviour

| Moment                                      | Behaviour                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static HTML / before fetch                  | **Loading** state: label "THE LAST VISITOR SAID", plus a placeholder marker band (tint-coloured bar, the quote's line-height, `aria-busy="true"`, visually hidden "Loading the latest mark…"). A soft pulse animation runs only with `prefers-reduced-motion: no-preference`. Reserved min-height, so no layout shift between states. `<noscript>`: the empty-state text. |
| Fetch                                       | `<last-visitor>` fetches `GET /api/guestbook/latest` when the section is within 600 px of the viewport (8 s timeout).                                                                                                                                                                                                                                                     |
| Message                                     | The quote text is written via `textContent`, with `--tint` set to the paint's tint var; `aria-busy` is removed.                                                                                                                                                                                                                                                           |
| Empty (`message: null`)                     | "No marks yet. Be the first to leave one!" (localized) with the default yellow tint.                                                                                                                                                                                                                                                                                      |
| Error (network, timeout, 5xx, invalid body) | A muted line: "Couldn't load the latest mark right now." plus a text button "Try again" (refetch). The form remains fully usable. Never a raw error.                                                                                                                                                                                                                      |
| Submit                                      | Trimmed-empty input → focus, no request. Otherwise a `clientRequestId` (kept until success or a text change), a busy button (spinner), then `POST`.                                                                                                                                                                                                                       |
| 202                                         | The `<dialog>` modal echoes the text with the tint; the input is cleared; focus returns to the input on close. The quote doesn't change ("in review").                                                                                                                                                                                                                    |
| Errors                                      | See [`api.md` §5](api.md#5-client-mapping-web).                                                                                                                                                                                                                                                                                                                           |
