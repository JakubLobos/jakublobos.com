# T-018: Implementation report, round 2 (pre-merge fixups)

- **Branch:** `task/T-018-phone-reveal`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Changes

- Merged `main`. In `apps/server/src/main.ts` I kept T-012 (`checkDatabase: guestbookRepo.ping`), T-015 (`createContactRoutes`) and the T-018 phone route.
- R1-01: `config.ts` refuses a production `TURNSTILE_ALLOWED_HOSTNAMES` that contains `localhost`. The unset default is `localhost`, so an unset value is refused too. Test: `config.test.ts` "rejects TURNSTILE_ALLOWED_HOSTNAMES that is ..." (two cases).
- R1-02: removed the redundant `fake verifier` block from `turnstile.verifier.test.ts`. The route tests still exercise the fake verifier.
- R1-03: the non-Polish `formatPhone` fixture is now `+442079460123` (Ofcom drama range).

## Validation

See the commit message and the coordinator reply for the `pnpm verify` summary.
