# T-030: Implementation report, round 2 (pre-merge fixups)

- **Branch:** `task/T-030-contact-ui` (`main` merged in, including the e2e sitekey pin and T-051)
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1-01   | fixed: `--contact-details-basis: 300px` next to `--contact-lead-max` in `tokens.css`; `Contact.astro` uses it.                                                                                                                                                                 |
| R1-02   | fixed: added `contact-phone-{failed,revealed}-{390,1440}.png` and `contact-nojs-390.png` (phone API mocked in the browser with the `+48000000000` fixture; the web dev server was the only one I could start because :3000 and :8787 were held by other agents).               |
| R1-03   | fixed: removed the 422 test in `contact.test.ts`, the 403 half in `phone.test.ts` and the per-field rule-code test in `contact-form.test.ts` (the `validateContact` trim case stays). Web tests: 255.                                                                          |
| R1-04   | fixed: `@media (forced-colors: active) { .reveal { color: LinkText } }`.                                                                                                                                                                                                       |
| R1-05   | fixed: removed `aria-busy={undefined}` and `data-tone={undefined}`. The unused-selector lint then flagged the script-set `[aria-busy='true']` and `[data-tone='error']` selectors, so the attribute part is wrapped in `:global(...)` with a comment (the class stays scoped). |

## Validation

`pnpm verify` exit 0: typecheck 0 errors; tests contracts 153, server 340, web 255; build complete. The e2e result is in the final message.
