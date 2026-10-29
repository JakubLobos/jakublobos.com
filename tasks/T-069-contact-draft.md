# T-069: Silent contact-form draft (sessionStorage)

- **Wave:** 7 (UX) · **Size:** S · **Depends on:** T-030 (done)
- **Owner decision (2026-10-27, D-32):** the contact form ("Let's build something" / its PL counterpart) silently keeps an unsent draft so a refresh, an accidental navigation or a language switch doesn't lose it.
  - There is **no UI and no message about it** in the form.
  - Storage is **`sessionStorage`**, chosen by the owner over `localStorage`. The draft lives only as long as the tab. This falls under the WP29 "user-input" consent exemption, and nothing lingers on shared devices.
  - The draft is cleared once the message is sent.

## Behaviour

- **What:** the `name`, `email` and `message` values exactly as typed (raw, not normalized). Never the honeypot (`website`), never the `clientRequestId`, never anything from the server.
- **Key:** `jl-contact-draft` (matches the `jl-` prefix of `jl-cookies`). Value: a small JSON object, e.g. `{ "v": 1, "name": "…", "email": "…", "message": "…" }`.
- **Save:** on each `input` of the three fields. A trailing debounce of ~300 ms is fine but optional (sessionStorage writes are cheap; pick the simpler option). When all three are empty, **remove** the key instead of storing empties.
- **Restore:** on init, before the visitor interacts, fill only fields that are currently empty (never overwrite browser autofill or text typed before the script ran). Then sync the counters. Restoring must **not** reveal validation errors: the fields are not "touched", and `tried` stays false.
  - If `TypingField` needs to know about the new value (its mirror), trigger its normal sync path (e.g. dispatch `input` or call its documented API), but make sure that doesn't mark fields as touched or save again needlessly.
- **Clear:** on the `sent` outcome (the same place confetti fires). The "Send another" reset leaves nothing stored.
- **Failure-safe:** every storage access is in `try/catch` (blocked storage, quota, private mode). If storage fails, the form works exactly as today.
- **Untrusted on read** (`docs/security.md`): parse with explicit narrowing or a small parser. Accept only the expected shape and `v: 1`. Clamp each string to that field's `maxlength` (`CONTACT_*_MAX` from `@portfolio/contracts`). Anything else gets discarded and removed. Values go into `.value` only, never into markup.

## Architecture (follow exactly)

- **Pure logic in `lib/`:** `apps/web/src/lib/contact-draft.ts` holds `parseContactDraft(raw: string | null): ContactInput | null` and `serializeContactDraft(values: ContactInput): string | null` (null when all fields are empty). Add a focused unit test: round trip, empty → null, malformed JSON, wrong version, wrong types, over-long strings clamped. No DOM in `lib/`.
- **Storage glue in its own module:** `apps/web/src/scripts/contact-draft.ts` exports a tiny API, e.g. `loadDraft()`, `saveDraft(values)`, `clearDraft()`, wrapping `sessionStorage` in `try/catch`. This follows the owner's one-responsibility-per-script rule: persistence doesn't live inside the form's logic.
- **Wiring only in `scripts/contact-form.ts`:** restore on init, save on input, clear on `sent`. Keep it to a few lines that follow the existing style.
- **Parallel task:** T-068 (another agent) adds one `bindLimitNudge(...)` call and an import to `contact-form.ts`. Keep your edits away from that and merge `origin/main` if it lands first (never rebase or force-push).

## Transparency (required even though the form shows nothing)

- **Privacy policy:** add the item to the storage/cookies list in `apps/web/src/i18n/messages/privacy.ts`, in EN **and** PL. Follow the existing entry format exactly:
  - name: `jl-contact-draft` (sessionStorage);
  - purpose: keeps an unsent contact-form draft in this tab;
  - legal basis: strictly necessary / requested by the user (match how `jl-cookies` is described);
  - where: your browser only, never sent;
  - duration: until the tab is closed or the message is sent.

  Flag the PL text for owner review in the report.

- **`docs/security.md`:** add the matching row to the storage table, next to `jl-cookies`.

## Allowed files

`apps/web/src/lib/contact-draft.ts` + `.test.ts` (new), `apps/web/src/scripts/contact-draft.ts` (new), `apps/web/src/scripts/contact-form.ts` (wiring only), `apps/web/src/i18n/messages/privacy.ts` (the storage entry only), `docs/security.md` (the storage row), `docs/content/pl-copy-review.md` (the new privacy rows, if that file tracks privacy copy), `tasks/T-069-contact-draft.md` (commit this spec, prettier-formatted), `tasks/reports/T-069/**`.

## Acceptance criteria

1. Type a name, an email and a message, then reload: the values come back, the counters are correct, and no error messages show.
2. Switch the language (EN ↔ PL): the draft comes back on the other locale's page.
3. A successful send removes `jl-contact-draft`; reload shows an empty form.
4. Close the tab and open the site in a new tab: no draft.
5. With blocked storage (e.g. `sessionStorage` throwing), the form works as before.
6. A tampered value (bad JSON, wrong shape, huge strings) is discarded or clamped, with no errors.
7. The privacy page lists the item in EN and PL; `pnpm verify` is green.

## Validation

- `pnpm verify`.
- Throwaway Playwright script (not committed): `pnpm --filter @portfolio/web build` + `astro preview --port 4409`. **Port 4409 only**: the owner runs `pnpm dev` on 3000/4321; kill only PIDs you started. Stub `POST **/api/contact` with `page.route`.
  - Check criteria 1–4 and 6 there, plus 5 via an init script that makes `sessionStorage.getItem`/`setItem` throw.
  - Report the results in a short table.
- Don't run `pnpm test:e2e`.
