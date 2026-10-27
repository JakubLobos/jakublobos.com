# T-013: Implementation report, round 2

- **Branch:** `task/T-013-review-providers` (main merged first; install clean)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: `blocked-terms.ts` now folds the whole text first (NFKD, strip `\p{M}` and `\p{Cf}`, lowercase, `ł→l`), then tokenizes, then leet-decodes. Test rows: combining strike-through for `fuck` and `kurwa`, soft hyphen, and a zero-width space.                                                                                      |
| R1-02   | fixed: `openai-moderation.provider.test.ts` runs the `clean`, `high-score` and `flagged` fixtures through `decideModeration(outcome, 0.2)` and asserts approve, reject (`hate`), reject (`harassment`).                                                                                                                                 |
| R1-03   | fixed: tokens with no letter skip leet decoding; `waited 455 days` is no longer a hit (test row).                                                                                                                                                                                                                                       |
| R1-04   | fixed (changed behaviour): the flood rule now ignores `\p{M}` and `\p{Cf}` characters instead of counting them as letters, so `❤️` counts once like `😀`, and Indic vowel signs stay neutral rather than looking like symbols. Why-comment added. Legit corpora still pass. Test: alternating `❤️🔥` and `😀🔥` floods are both caught. |
| R1-05   | no change this round, as instructed.                                                                                                                                                                                                                                                                                                    |
| R1-06   | fixed: `http.ts` cancels the unread body on non-2xx before returning the failure (`cancel().catch(() => undefined)`); test checks a stream's `cancel` ran on a 500.                                                                                                                                                                     |

## Validation output

```
$ pnpm verify    -> exit 0
format, lint, typecheck: clean
test: contracts 153, server 194 (16 files), web 69
build: Done
```

## Re-review follow-up

- R1-03 narrowed: leet decoding is skipped only for pure-digit tokens, so `455` and `2024` stay numbers while all-symbol tokens like `@$$` still decode to `ass` (test row added).
