# ADR-0006: Guestbook: newest-wins moderation queue, retention ≤ 100, private archive

- **Status:** Accepted (owner decisions D-05, D-17, 2026-10-25) · **Related:** FR-40…FR-48, `guestbook-moderation.md`

## Context

The brief says no message is visible before moderation passes, the database holds at most 100 messages, and the backend must degrade gracefully when the provider fails. The owner added:

- "Always retry the newest message. If there are 2 not-verified messages there is no need to verify the older, because it will never be shown."
- "Frontend should be able to get only the newest AND verified message."
- "Some type of archive, but with no risk that someone can flood our database."

## Decision

- Persisted statuses: `pending` and `approved`. Rejected, superseded, and expired messages are **deleted** and logged as events.
- **Newest wins:** at most **one** pending row. Inserting a submission deletes any existing pending row (superseded) in the same transaction. The worker therefore only ever moderates or retries the newest unverified message. An in-flight review of a superseded row ends harmlessly, because approval is guarded by `WHERE status='pending'` and the row is gone.
- `POST` inserts the pending row and returns `202` immediately. An in-process worker runs the review pipeline (ADR-0005) on nudge, every 15 s, and at startup, with backoff. A pending row expires after 24 h.
- **Public read:** only `GET /api/guestbook/latest`, which returns the newest _approved_ message. No list endpoint exists.
- **Retention:** at most 100 rows in total, enforced in the insert transaction (evict the oldest approved rows) and by a DB trigger.
- **Private archive:** the up-to-100 approved rows are the archive. The owner reads and exports them with the admin CLI (`list`, `export --format json|csv`). Daily volume backups keep history beyond 100.
- **Flood resistance:**
  - Storage is hard-bounded: ≤ 100 rows of ≤ 120 characters, ≤ 1 pending.
  - Archive displacement is bounded by the global accepted-submission caps (20/h, 50/day) and per-IP limits (3/10 min, 10/day). Even a sustained distributed flood displaces at most 50 archived messages per day, and only with texts that passed all three review layers.
  - Paid review calls are bounded by the same caps.

## Alternatives considered

| Option                                                          | Why not                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| FIFO queue that moderates every pending message (previous plan) | Wastes provider calls on messages that can never be shown; the owner asked for newest-wins                   |
| Public archive page                                             | The owner chose a private archive; it would also expose every historical message as part of the site's image |
| Unbounded archive table                                         | Contradicts the 100-message brief and creates flood risk; backups cover long-term history                    |
| Fail fast without a queue                                       | The owner chose queue-and-retry                                                                              |

## Consequences

- If two visitors submit within the same second, the earlier note may be superseded before review. That's acceptable by owner decision, because only the newest can be shown anyway.
- An attacker can supersede a legitimate pending note by submitting right after it. The impact is limited (the legitimate note was never shown yet), and it's bounded by rate limits.
- The concurrency surface shrinks: one pending row, one worker, idempotent approval.
