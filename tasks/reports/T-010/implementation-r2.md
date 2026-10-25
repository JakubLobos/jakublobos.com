# T-010: Implementation report, round 2

- **Branch:** `task/T-010-contracts`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

Merged `main` first (updated api.md, testing.md, task file).

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: `locale: LocaleSchema.optional()` (`z.enum(LOCALES)`) on guestbook and contact request schemas; types follow. Tests: `schemas.test.ts` "locale field" (en/pl/absent accepted, `de`/number rejected) and the guestbook example now includes `locale: 'pl'`.                                                                                                                                                       |
| R1-02   | fixed: `\b` replaced by Unicode lookarounds; no `i` flag so the TLD must be lowercase in the original; `socket.io` allowlist (also still caught as `socket.io.com`). Table tests catch `пример.ru`, `ąę.pl`, `żółć.pl`, `example.pl`, `http://`, `www.`; pass `to.coś`, `Super.Coś`, `Node.js`, `e.g.`, `i.e.`, `v1.2`, `3.14`, `ASP.NET`, `job.Me`, `Socket.io`, `Example.COM`.                                        |
| R1-03   | fixed: email 120 ok / 121 `too_long`; contact message NFC; whitespace-only through pipeline -> `empty`; accepted 0x7e.                                                                                                                                                                                                                                                                                                  |
| R1-04   | fixed: new `checkGuestbookBody(raw) -> { normalized, errors }` checks characters on the NFC text before trim/collapse (collapsible whitespace controls \t\n\v\f\r exempted there), so U+FEFF leading/trailing/inside -> `invalid_characters`. JSDoc documents the order. `normalizeGuestbookBody` / `validateGuestbookBody` kept. Contact fields still validate post-trim (only guestbook was in scope of the finding). |
| R1-05   | fixed: phone fixtures are `+48 000 000 000` / `+48000000000`.                                                                                                                                                                                                                                                                                                                                                           |
| R1-06   | fixed: `"test:coverage": "vitest run --coverage"` in contracts package.json.                                                                                                                                                                                                                                                                                                                                            |
| R1-07   | fixed: `containsForbiddenCharacters` returns true when `!text.isWellFormed()`; applies to guestbook body and contact name/message. Tests added for both.                                                                                                                                                                                                                                                                |

## Validation output

```
$ pnpm --filter @portfolio/contracts test:coverage
 Test Files  4 passed (4)   Tests  153 passed (153)
 Branches : 100% ( 55/55 )  Lines : 100% ( 81/81 )
$ pnpm verify -> exit 0
```

## Change Requests

- None new (CR-1 from round 1 unchanged).

## Open issues and follow-ups

- Callers (T-012/T-014) should use `checkGuestbookBody`, not the two halves.
