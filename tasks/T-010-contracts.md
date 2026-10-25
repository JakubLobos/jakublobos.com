# T-010: Shared API contracts, constants, and validation rules

|                          |                                           |
| ------------------------ | ----------------------------------------- |
| **Wave**                 | 2                                         |
| **Depends on**           | T-001                                     |
| **Blocked by decisions** | none                                      |
| **Parallel with**        | T-011, T-020                              |
| **Size**                 | M                                         |
| **Requirements**         | FR-26, FR-29, FR-40, FR-45, FR-47, NFR-05 |

## Objective

Implement `@portfolio/contracts`: the single executable definition of the HTTP API (`docs/api.md`) and the shared, pure validation rules that both the server and the web app use.

## References

- `docs/api.md` (entire)
- `docs/guestbook-moderation.md` §3 (lengths, paints)
- `docs/architecture.md` §3
- `docs/testing.md` §3 (validation boundaries)

## Scope

- `src/constants.ts`: everything in `api.md` §2.
- `src/schemas.ts` (zod 4):
  - `GuestbookSubmitRequestSchema`, `GuestbookSubmitResponseSchema`, `GuestbookMessageDtoSchema`, `GuestbookLatestResponseSchema`
  - `ContactRequestSchema`, `ContactResponseSchema`
  - `ApiErrorBodySchema`, `ErrorCodeSchema`, `FieldErrorCodeSchema`

  Request schemas validate **shape and types only**: strings, UUID, paint enum, and a raw max length of 4× the limit to bound work. Semantic rules live in `rules/`.

- `src/types.ts`: types inferred with `import type` from the schemas, plus `ApiSuccess<T>`, `ApiErrorBody`, `ErrorCode`, `FieldErrorCode`, `PaintId`, `Locale`.
- Phone reveal (ADR-0015): `PhoneRevealRequestSchema` (`{ turnstileToken }`), `PhoneRevealResponseSchema` (`{ display, tel }`), and error codes `VERIFICATION_FAILED` and `VERIFICATION_UNAVAILABLE` (`api.md` §1.1, §3).
- `src/rules/guestbook-content.ts`:
  - `normalizeGuestbookBody(raw): string` (NFC, trim, collapse whitespace runs into one space)
  - `validateGuestbookBody(normalized): FieldErrorCode[]` (`empty`, `too_long`, `invalid_characters`, `links_not_allowed`, `contact_info_not_allowed`; in that priority order; return all that apply)
  - Exported helpers `containsLink`, `containsContactInfo`, `containsForbiddenCharacters`, plus the curated TLD list.
- `src/rules/contact-fields.ts`: `normalizeContactInput(raw)` and `validateContactInput(normalized): Partial<Record<'name'|'email'|'message', FieldErrorCode[]>>` per `api.md` §3 (email regex identical to the design's).
- `src/index.ts` re-exports constants, types, and rules. It must **not** import `schemas.ts` at runtime (type-only imports are fine).

## Out of scope

Server-side dedupe hashing and blocked terms (T-013/T-014). HTTP wiring.

## Allowed files

`packages/contracts/**`, `docs/api.md` (only to fix a discovered inconsistency, via a Change Request in the report).

## Dependencies

Already present (`zod@4.6.7`). No new dependencies.

## Interfaces / contracts

These export names are relied upon by T-012…T-016 and T-029/T-030. Don't rename them after merge.

## Implementation notes

- Length is measured as **UTF-16 code units** (`string.length`), matching HTML `maxlength`.
- Forbidden characters: C0 (U+0000–001F) and C1 (U+007F–009F) controls; U+202A–202E; U+2066–2069; U+200B; U+2060; U+FEFF. **Allow** U+200D (ZWJ, used in emoji sequences). For contact `message`, `\n` and `\t` are allowed; for `name`, nothing is.
- Links: match `https?://`, `www.`, and `\b[\p{L}\p{N}-]+\.(tld)\b` (case-insensitive) with a curated TLD list: com, net, org, pl, eu, io, dev, app, co, me, info, biz, xyz, ru, de, uk, us, online, site, top, shop, link, click, gg, ly, tk. It must **not** match `Next.js`, `Node.js`, `e.g.`, `i.e.`, `v1.2`, or `3.14`.
- Contact info: email `[^\s@]+@[^\s@]+\.[^\s@]{2,}`; phone `(?:\+?\d[\s.-]?){9,}` (9+ digits).
- No `enum`. Use `as const` arrays plus `z.enum(PAINT_IDS)`.

## Acceptance criteria

- **AC-1** All names in `api.md` §2 are exported with exactly those values.
- **AC-2** Schemas accept every example request and response in `api.md` and reject wrong types, unknown paints, non-UUID IDs, and oversized raw strings.
- **AC-3** Rule functions return the codes in `api.md` for every listed case (see Tests).
- **AC-4** Importing `@portfolio/contracts` (the index) in a scratch Vite build pulls in no zod code. Prove it by building a tiny entry with `vite build` in a temp dir, or by asserting that `index.ts` has no value import from `schemas.ts`/`zod`, enforced by a unit test that reads the source.
- **AC-5** Coverage ≥ 95 % lines and 90 % branches for `src/`.

## Tests required

Table-driven `*.test.ts` covering:

- guestbook length 0, 1, 120, and 121 (including a 120-unit string ending with a surrogate pair)
- whitespace collapse
- NFC (decomposed `ł`)
- each forbidden code point, and a ZWJ emoji allowed
- link positives and negatives (as listed)
- email, phone positives, and years like `2023 2024` (8 digits) allowed
- contact name 1/2/60/61, email edge cases, message 9/10/1000/1001 and CRLF normalization

## Validation

```
pnpm verify
pnpm --filter @portfolio/contracts test -- --coverage
```

## Definition of done

Standard DoD.
