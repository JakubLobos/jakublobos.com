# T-010: Implementation report, round 1

- **Branch:** `task/T-010-contracts`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Implemented `@portfolio/contracts`: constants (api.md section 2 plus error/field-error code lists), zod 4 schemas (guestbook, contact, phone reveal, error envelope), inferred types (`Locale` moved to `types.ts`, R1-01), and the pure rules `guestbook-content.ts` / `contact-fields.ts`. `index.ts` re-exports constants, types (`export type *`) and rules and has no value import of `schemas.ts`; schemas stay on the `./schemas` subpath.

## Files changed

| File                                                                     | Change                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/contracts/src/constants.ts`                                    | added: api.md section 2 values, `ERROR_CODES`, `FIELD_ERROR_CODES` |
| `packages/contracts/src/schemas.ts`                                      | added: all schemas                                                 |
| `packages/contracts/src/types.ts`                                        | added: inferred types, `Locale`, `PaintId`, `ApiSuccess<T>`        |
| `packages/contracts/src/rules/guestbook-content.ts`, `contact-fields.ts` | added: normalization and validation                                |
| `packages/contracts/src/index.ts`                                        | modified: re-exports (Locale now from types)                       |
| `packages/contracts/src/*.test.ts`, `rules/*.test.ts`                    | added: 4 test files, 122 tests                                     |
| `packages/contracts/vitest.config.ts`                                    | modified: v8 coverage with 95/90 thresholds                        |
| `packages/contracts/package.json`, `pnpm-lock.yaml`                      | modified: `@vitest/coverage-v8@5.0.5` devDependency                |

## Acceptance criteria

| #    | Criterion                                 | Status | Evidence                                                                                                                                                                                                             |
| ---- | ----------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | api.md section 2 names/values exported    | pass   | `index.test.ts` "exports the exact values", "lists every error and field error code"                                                                                                                                 |
| AC-2 | Schemas accept examples, reject bad input | pass   | `schemas.test.ts` (examples, wrong type, unknown paint, non-UUID, oversized raw 481/241/481/4001)                                                                                                                    |
| AC-3 | Rules return api.md codes                 | pass   | `guestbook-content.test.ts`, `contact-fields.test.ts` (lengths 0/1/120/121 with surrogate pair, NFC, each forbidden code point, ZWJ, link +/-, email/phone, `2023 2024`, contact 1/2/60/61 and 9/10/1000/1001, CRLF) |
| AC-4 | Index pulls in no zod                     | pass   | `index.test.ts` "has no value import from schemas.ts or zod", "does not expose schemas at runtime"                                                                                                                   |
| AC-5 | Coverage >= 95/90                         | pass   | 100% lines, 100% branches (below)                                                                                                                                                                                    |

## Validation output

```
$ pnpm verify          -> exit 0 (format:check, eslint, typecheck, tests, astro build all green)
$ pnpm --filter @portfolio/contracts exec vitest run --coverage
 Test Files  4 passed (4)
      Tests  122 passed (122)
Statements   : 100% ( 89/89 )
Branches     : 100% ( 53/53 )
Functions    : 100% ( 8/8 )
Lines        : 100% ( 72/72 )
```

## Tests added

- `schemas.test.ts`, `index.test.ts`, `rules/guestbook-content.test.ts`, `rules/contact-fields.test.ts` as listed above.

## Assumptions

- `website` (honeypot) is optional in request schemas, max 500 chars.
- `publishedAt` validated with `z.iso.datetime()`; `id` with `z.uuid()`.
- `PhoneRevealRequestSchema.turnstileToken`: 1..4096 chars.
- Contact `name` too short includes empty (0 chars -> `too_short`); email empty -> `required` only; email too long and invalid can both be returned.
- Contact message trim happens after CRLF/CR -> LF; lone CR is also converted to LF.
- The task's "decomposed l-with-stroke" has no canonical decomposition; the NFC test uses e+U+0301 and a+U+0328 and asserts U+0142 is unchanged.
- `pnpm --filter ... test -- --coverage` passes `--coverage` after `--` which vitest ignores here, so I ran `vitest run --coverage` via `exec`; thresholds are enforced in `vitest.config.ts` for `--coverage` runs.
- Lint required `interface` for `ContactInput` and `ApiSuccess<T>`.

## Deviations from spec or design

- None.

## Change Requests (shared surfaces / dependencies)

- **CR-1:** added `@vitest/coverage-v8@5.0.5` (exact, matches vitest 5.0.5) as a devDependency of `@portfolio/contracts` (lockfile updated). It is on the approved list (architecture.md section 10) but not named in T-010; AC-5 cannot be measured without it. Other packages will need the same.

## Open issues and follow-ups

- `docs/api.md` section 2 snippet shows `DEFAULT_LOCALE = 'en'` untyped; matches. No inconsistency found.
- No PL strings in this task.
