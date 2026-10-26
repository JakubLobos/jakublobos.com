# T-033: Implementation report, round 2

- **Branch:** `task/T-033-privacy-404` (main merged first)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

The policy is still a draft needing owner and legal review (PL for D-02).

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: the Turnstile row now says browser signals **and your IP address**, and that the API sends the IP to Cloudflare to verify the check. The IP row now reads "the API keeps it in memory only; the app never saves it or logs it" and points to the Turnstile row. EN and PL.     |
| R1-02   | fixed: guestbook retention now says shown publicly until replaced, then kept in the private archive (<= 100) until pushed out or deleted on request; pending <= 24 h; copies remain in backups until they rotate out `[OWNER: confirm backup retention]` (fifth placeholder). EN, PL. |
| R1-03   | fixed: new data-table row "Technical request data: IP address, browser user agent, requested URL, time", Cloudflare (site) and Railway (API) as processors, retention per the hosts. The Cloudflare and Railway sections mention it too. EN, PL.                                      |
| R1-04   | fixed: the automated-decision sentence now says "simple text rules and the OpenAI checks described below". EN, PL.                                                                                                                                                                    |
| R1-05   | fixed: new "Privacy and 404 pages" token group in `tokens.css` (`--page-chrome-h`, `--policy-measure`, `--policy-term-w`, `--policy-desc-basis`, `--policy-table-min-w`), used by both pages.                                                                                         |
| (nit)   | fixed: the e2e table test loops over both locales (13 rows = header + 12 categories, 5 columns).                                                                                                                                                                                      |

## Owner placeholders (now five)

1. Controller postal address or business registration.
2. Railway region (data table and Railway section).
3. Mailbox retention for contact messages.
4. GA4 retention period.
5. Backup retention for guestbook copies (new).

## Files changed

`apps/web/src/i18n/messages/privacy.ts`, `apps/web/src/components/pages/{PrivacyPage,NotFoundPage}.astro`, `apps/web/src/styles/tokens.css` (new token group, approved by the coordinator), `e2e/privacy-and-404.spec.ts`, this report.

## Validation

`pnpm verify`: green after merging main (tests 153 + 343 + 285, typecheck 0 errors, build complete). `E2E_API_PORT=3120 E2E_SITE_PORT=8817 pnpm test:e2e e2e/privacy-and-404.spec.ts`: 22 passed, 2 skipped (mobile header switcher).
