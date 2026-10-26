# T-033 review, round 2

- **Reviewer:** orchestrator (Opus), re-review of round 1 findings
- **Verdict:** APPROVED (policy text remains a draft for owner and legal review)

| Finding                                      | Status                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01 MAJOR IP sent to Turnstile undisclosed | Fixed: the Turnstile row and the Cloudflare section state the API sends the visitor IP to verify the check; the IP row says "not stored or logged by the app".                                                                                                            |
| R1-02 MAJOR guestbook retention / backups    | Fixed: public until replaced, private archive ≤ 100 rows until pushed out, pending ≤ 24 h, deletion on request, backup copies until they rotate out (`[OWNER: confirm backup retention]`; `docs/operations.md` gives "within 6 days" once the Daily schedule is enabled). |
| R1-03 MAJOR host request data                | Fixed (approved beyond the original table; `security.md` §8 updated on main): IP, user agent, URL, time at Cloudflare and Railway as processors.                                                                                                                          |
| R1-04 NIT automated-decision wording         | Fixed: mentions the local text rules and the OpenAI checks.                                                                                                                                                                                                               |
| R1-05 NIT raw layout values                  | Tokenised (privacy group).                                                                                                                                                                                                                                                |

E2E table test now loops over EN and PL. Owner placeholders (5): controller address/registration, Railway region, mailbox retention, GA4 retention, backup retention, all listed in `tasks/README.md` and the go-live checklist. Gate C: `pnpm verify` and `e2e/privacy-and-404.spec.ts` on the squash-merged tree.
