# T-069 implementation report (round 1)

Silent contact-form draft in `sessionStorage` under `jl-contact-draft`.

## Changes

- `apps/web/src/lib/contact-draft.ts` (+ `.test.ts`): pure `serializeContactDraft` / `parseContactDraft` and the key constant. Parse accepts only `{ v: 1, name, email, message }` strings and clamps to `CONTACT_*_MAX`.
- `apps/web/src/scripts/contact-draft.ts`: `loadDraft` (removes an invalid stored value), `saveDraft` (removes the key when empty), `clearDraft`; every access in `try/catch`.
- `apps/web/src/scripts/contact-form.ts`: wiring only. Import; `saveDraft(values())` in the existing `input` listener; `clearDraft()` on `sent`; restore of empty fields before the initial counter sync (sets `.value`, dispatches a bubbling `input` so the typing mirror and counter sync; `touched`/`tried` untouched, so no errors).
- `apps/web/src/i18n/messages/privacy.ts`: new row in both storage tables, EN and PL.
- `docs/security.md`: storage-table row. `docs/content/pl-copy-review.md`: regenerated with `node tools/i18n/export-copy.ts`.
- `tasks/T-069-contact-draft.md`: spec, prettier-formatted.

## Acceptance criteria

| #   | Criterion                                  | Result | Evidence                                                                                                                                         |
| --- | ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Reload restores values, counter, no errors | PASS   | Playwright script on port 4409: values restored, counter `11/1000`, errors empty, typing mirror synced                                           |
| 2   | Language switch keeps draft                | PASS   | `/` to `/pl` and back: draft present, no errors                                                                                                  |
| 3   | Send clears the key                        | PASS   | Key null after send and after "Send another"; reload shows empty form                                                                            |
| 4   | New tab has no draft                       | PASS   | Second page in same context: empty fields                                                                                                        |
| 5   | Blocked storage works                      | PASS   | Init script makes `Storage.prototype.getItem/setItem/removeItem` throw; a full send succeeded, no page errors                                    |
| 6   | Tampered value discarded/clamped           | PASS   | Bad JSON, wrong shape, wrong version: discarded and key removed, no errors; 500/500/5000 chars clamped to 60/120/1000. Unit tests cover the same |
| 7   | Privacy page EN+PL; verify green           | PASS   | Rows in both tables and both locales; `pnpm verify` exit 0                                                                                       |

The Playwright script is throwaway (not committed). The server was the Node edge emulator on port 4409, stopped afterwards (PID 29132).

## pnpm verify

Exit 0. contracts 153 tests, server 412 tests (33 files), web 348 tests (32 files, includes the new `contact-draft.test.ts`); build succeeded and `Budgets OK`.

## PL text for owner review

- Table 1 (full): name `„jl-contact-draft” (pamięć sesji)` · purpose `Zachowanie niewysłanej wersji roboczej wiadomości z formularza kontaktowego w tej karcie` · basis `Niezbędne (o to prosisz)` · where `Tylko Twoja przeglądarka; nigdy nie jest wysyłany` · duration `Do zamknięcia karty lub wysłania wiadomości`.
- Table 2 (short): `jl-contact-draft (pamięć sesji)` · `Twoja niewysłana wersja robocza wiadomości` · `Piszesz w formularzu kontaktowym` · `Do zamknięcia karty lub wysłania wiadomości`.
- Intro sentence changed from "dwa pierwsze wpisy" to "trzy pierwsze wpisy" (EN: "first three entries"), because the new entry is user-requested and sits third.

## Assumptions and notes

- The intro sentence edit above is outside "the storage entry only"; it was needed to keep the policy true.
- Legal basis wording mirrors the `lang` row ("Strictly necessary (you asked for it)") rather than `jl-cookies`, since the draft is user-requested.
- PL uses "(pamięć sesji)" because the copy exporter whitelists only `(local storage)`/`(cookies)` suffixes as untranslated, and an identical EN/PL string would be flagged.
- Restore dispatches `input`, which also triggers one redundant `saveDraft` (rewrites the same clamped value); simpler than a second code path.
- `export-copy` still reports one pre-existing unwhitelisted PL==EN string (`Google (Gemini API)`, not part of this task). The committed `pl-copy-review.md` was stale (335 vs 359 strings), so its diff is larger than the new rows.

## Open issues

None.
