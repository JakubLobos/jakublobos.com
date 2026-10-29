# T-010: Review, round 2

- **Reviewed:** `task/T-010-contracts` @ `824054e` (includes merge `a69144a` of main @ `c233423`, which carries the orchestrator's R1 decisions and the `api.md` update) against `main` @ `7c1daf8` (after `c233423` main gained the T-020 web/tokens merge; no overlap with `packages/contracts`)
- **Reviewer / model:** claude-opus-5-5
- **Verdict:** APPROVED. No BLOCKER, MAJOR, or QUESTION is open, and Gate B is met. The remaining items are NITs or follow-ups.

## Gate results (re-run by reviewer)

| Command                                            | Result                                                                                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                   | PASS "Lockfile is up to date"                                                                                                                            |
| `pnpm verify`                                      | PASS exit 0. contracts: 4 files / 153 tests passed. `astro check` 0 errors. Build complete                                                               |
| `pnpm --filter @portfolio/contracts test:coverage` | PASS Statements 100 % (99/99) · Branches 100 % (55/55) · Functions 100 % (10/10) · Lines 100 % (81/81), with the 95/90 thresholds enforced by the script |

Extra checks:

- **Scratch Vite 8.3.5 build** (`%TEMP%`, unminified). The entry imports `checkGuestbookBody`, `validateContactInput`, `normalizeContactInput`, `PAINT_IDS`, and the `GuestbookSubmitRequest`/`Locale` types from the index. The bundle is 5,539 B with **0** matches for `zod|ZodError|ZodType`.
- **Code against `api.md` §3** (as updated on main): `locale` is optional on both requests, and the link, forbidden-character, and lone-surrogate rules match the doc text.

## Scope check

Code changes are only in `packages/contracts/**` plus the implementation report. The doc and task changes in the branch diff come from merging main (orchestrator commits `abe9865` and `c233423`), not from the implementer. No new dependencies.

## Acceptance criteria (independently verified)

| #    | Status | Evidence gathered by reviewer                                                                                                                                                                                |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | PASS   | Constants are unchanged since round 1 and still asserted by `index.test.ts`.                                                                                                                                 |
| AC-2 | PASS   | The `api.md` examples now include `locale: 'pl'`/`'en'` and parse. Missing `locale` is accepted. `de` and a number are rejected (`schemas.test.ts`, "locale field"). The other round-1 evidence still holds. |
| AC-3 | PASS   | I probed the rules with about 60 adversarial inputs (below). Codes and priority order match `api.md` §3.                                                                                                     |
| AC-4 | PASS   | Source test plus the scratch bundle (0 zod).                                                                                                                                                                 |
| AC-5 | PASS   | 100/100 through `test:coverage`.                                                                                                                                                                             |

## Probes of the new link rule and pipeline (reviewer's run)

- **Caught:** `a.pl.`, `x.pl/`, `ąę.pl,`, `пример.ru`, `abcпример.ru`, `😀example.com😀`, `xn--80ak6aa92e.com`, `my_site.com`, `EXAMPLE.com`, `(example.com)`, `"example.com"`, `日本.com`, `-.com`, `node.js.org`, `socket.io.pl`, `socket.io-pl.com`, `evil-socket.io`, `mysocket.io`, `socket.io and evil.io`, `socket.ioevil.com`, `wwW.x`, `hxxp://x.com` (via `x.com`), and `ex` + U+200D or U+00AD + `ample.com`.
- **Passes (expected or accepted):** `пример.рф` and `xn--p1ai` (TLD not in the list), `example.Com` (accepted lowercase-TLD trade-off), `socket.io/docs` (allowlist), `vue.js`, `w.w.w.example`. `example.com` + U+0301 becomes `example.coḿ` after NFC, so it is not a link.
- **Evasions that pass:** see R2-02.
- **Allowlist mechanics:** the `g` regex is only used with `String.prototype.replace`, which resets `lastIndex`, so there is no state leak. Replacing with a space can't create a new match or hide a neighbouring one (checked with `socket.io.pl`, `socket.io-pl.com`, and `socket.ioevil.com`).
- **ReDoS:** I timed 4× the limit (480 chars) on adversarial shapes: long label runs, `ab.` repeats, dash runs, `a.cox` near-TLDs, Cyrillic runs, `a…@a…`, `a@a.a.…`, digit and separator runs, `socket.io` spam, and whitespace mixes. `containsLink` takes ≤ 77 µs. `checkGuestbookBody` takes ≤ 0.64 ms (worst case `a`×240 `@` `a`×239). The cost comes from the round-1 `EMAIL` regex, which is quadratic (R2-01). The 480-char schema cap bounds it.
- **Pipeline (`checkGuestbookBody`):** U+FEFF at the start, end, or middle → `invalid_characters`. A lone BOM → `empty` + `invalid_characters`. Lone surrogates → `invalid_characters`. U+001C, U+0085, U+200B, and NUL are rejected. `\t\v\f\r\n` collapse to a space without an error. NBSP and U+2028 collapse.
- **Contact (`normalizeContactInput` → `validateContactInput`):** interior `\v`, `\f`, a lone surrogate, or U+FEFF → `invalid_characters`. U+FEFF or `\v` at the **edges** of the name or message is trimmed away and returns no error.

### Judgements requested by the orchestrator

- **Exempting `\t\n\v\f\r` from the pre-collapse check: acceptable.** All five are ECMAScript whitespace, so normalization turns them into one space and they never reach storage or providers. The round-1 path never reported them either, because they were gone after normalization. Rejecting a pasted newline or tab would be hostile UX for a single-line field. C0 controls that aren't JS whitespace (U+0000–0008, U+000E–001F) and U+0085 are still rejected.
- **Contact fields validating after trim: acceptable.** This is literally what `api.md` says ("NFC, trim" → rules). Edge-only invisible characters are removed from the value that gets emailed, and interior ones are still reported, so nothing harmful gets through. The only difference from the guestbook is cosmetic: a user with a stray edge BOM sees no error, and that is the better outcome.

## Checklist

Requirements and design PASS · Correctness PASS (NITs R2-02, R2-03) · Architecture PASS · Type safety PASS · Security and privacy PASS (fixtures now `+48000000000`) · Accessibility N/A · Responsive and performance PASS (index bundle 5.5 kB, no zod) · Tests PASS (each R1-03 gap now has a test that fails if the behaviour regresses; I checked the email 120/121, message NFC, whitespace-only pipeline, and `0x7e` cases) · Process PASS

## Findings

| ID    | Severity | Location                                                        | Problem                                                                                                                                                                                                                                                                                                                                            | Why (ref)                                                     | Expected fix                                                                                                                                                                                                                                        |
| ----- | -------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-01 | NIT      | `packages/contracts/src/rules/guestbook-content.ts:42`          | `EMAIL` is unanchored, so it is O(n²). Timings: 0.64 ms at 480 chars, 38 ms at 4,000, and seconds at 40,000 (the reviewer's 40k run had to be stopped). Today it is only safe because the schema caps the guestbook body at 480 before the rules run. The function is exported, and a later caller could pass unbounded text.                      | `security.md` (bounded work); defence in depth                | Make the start position a run boundary, e.g. `/(?<![^\s@])[^\s@]+@[^\s@]+\.[^\s@]{2,}/`, or document the input bound in a _why_ comment. Optional: a test asserting a 40k input completes (no wall-clock assertion needed beyond the test timeout). |
| R2-02 | NIT      | `packages/contracts/src/rules/guestbook-content.ts:36-41,74-76` | Invisible or look-alike evasions still pass: U+200D (allowed) or U+00AD soft hyphen inside the TLD (`x.c\u200Dom`, `x.c\u00ADom`), and look-alike dots U+3002 and U+FF0E (`example。com`, which browsers treat as a dot in hostnames). Labels ending in a combining mark (`हिन्दी.com`) are also missed, because `\p{M}` isn't in the label class. | `api.md` §3 (links); orchestrator: moderation is the backstop | Optional, if cheap: before the link test, delete U+00AD/U+200C/U+200D and map U+3002/U+FF0E/U+FF61 to `.`, and add `\p{M}` to the label class. Otherwise accept as a known gap.                                                                     |
| R2-03 | NIT      | `packages/contracts/src/rules/guestbook-content.ts:100-103`     | `validateGuestbookBody` is still exported and gives different results from `checkGuestbookBody` (it can't see a trimmed or collapsed U+FEFF). The JSDoc warns about this, but T-012, T-014, and T-029 could still pick the wrong one.                                                                                                              | maintainability; R1-04 intent                                 | Keep it, but say in the task notes for T-014/T-029 that `checkGuestbookBody` is the only entry point. Or make `validateGuestbookBody` internal in a later contracts change (export names are frozen after merge, so decide now).                    |

## Previous findings status

| ID    | Status                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1-01 | resolved: `LocaleSchema.optional()` on both request schemas, `api.md` examples updated by the orchestrator, tests for en/pl/absent/invalid.                                          |
| R1-02 | resolved per the orchestrator's decision: Unicode lookarounds, lowercase TLD, and the `socket.io` allowlist. Verified with the probes above. The remaining evasions are R2-02 (NIT). |
| R1-03 | resolved: email 120/121 (`108`/`109` + `@company.com`), message NFC, whitespace-only pipeline → `empty`, and `0x7e` accepted. Each would fail under the round-1 mutations.           |
| R1-04 | resolved: `checkGuestbookBody` checks the NFC text before trim/collapse, so U+FEFF at the start, middle, or end is reported. Documented in JSDoc and `api.md`.                       |
| R1-05 | resolved: `+48 000 000 000` / `+48000000000`.                                                                                                                                        |
| R1-06 | resolved: `test:coverage` script; the task file now uses it.                                                                                                                         |
| R1-07 | resolved: `!isWellFormed()` → forbidden, covering the guestbook body and the contact name and message. Tests added.                                                                  |

## Notes for orchestrator

- **Downstream contract:** T-012, T-014, and T-029 should call `checkGuestbookBody(raw)`, not `normalizeGuestbookBody` + `validateGuestbookBody` (R2-03). It is worth adding a line to those task files.
- `String.prototype.isWellFormed` is ES2024 (Chrome 111, Safari 16.4, Firefox 119). On older browsers, the web form's client-side validation would throw. Confirm this matches the supported-browser policy, or have T-029 guard the call. The server (Node 24) is unaffected.
- T-013 should still cover bodies made only of invisible but allowed characters (a lone ZWJ passes `checkGuestbookBody`).
