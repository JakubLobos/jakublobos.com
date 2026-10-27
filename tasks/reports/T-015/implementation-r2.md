# T-015: Implementation report, round 2

- **Branch:** `task/T-015-contact-api` (main merged first; `main.ts` conflict resolved by keeping T-012's `guestbookRepo.ping` health entry and appending the contact entry)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | Fixed at the root. The mail body no longer contains `Sent:`, so the same `clientRequestId` plus the same input gives a byte-identical payload (the service no longer takes a clock). `ResendMailer` maps 409 `invalid_idempotent_request` to `{ ok: true }` and 409 `concurrent_idempotent_requests` to `provider_error` (503), logged at `warn` instead of the configuration error. Tests: service and route retry → identical mail and 200; both 409 names in `mail.test.ts`. |
| R1-02   | Added the route test "caps accepted mail at 60 per day" (`FakeClock`, 3 × 20 sends on distinct IPs, 61st → 503 with `Retry-After` > 1 h, 60 sent).                                                                                                                                                                                                                                                                                                                              |
| R1-03   | Fixed (a few lines): a missing key maps to `required`, and a non-object body gives 422 without `fields`. Test: "reports a missing field as required…".                                                                                                                                                                                                                                                                                                                          |
| R1-04   | Removed the duplicate 503 row, replaced the `typeof` test with one that checks the configured `from`/`to` reach the request, and cut the route-level Resend `it.each` to a single 5xx case.                                                                                                                                                                                                                                                                                     |
| R1-05   | Dropped the copy loop; the service returns `ContactFieldErrors` directly.                                                                                                                                                                                                                                                                                                                                                                                                       |

## Validation output

```
$ pnpm verify  -> exit 0 (contracts 153, server 154 in 13 files, web 69; typecheck 0 errors; build ok)
```

## Deviations

- The mail body drops the "ISO time" item named in the task scope, by orchestrator decision (R1-01); the email's own Date header carries the time. `docs/api.md` and the task text were not edited.
- A retry of a delivered submission still spends one unit of the global caps (the service can't know it's a replay).
