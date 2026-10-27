# T-021: Implementation report, round 2

- **Branch:** `task/T-021-i18n-pages-seo` (merged `main`, no conflicts)
- **Status claimed:** READY_FOR_REVIEW, with the local-environment caveat below

## Previous findings

| Finding | Resolution                                                                                                                                                                                    |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: `--z-skip: 10` added to `tokens.css` (+ `tokens.test.ts`); `SkipLink` uses it so the focused link paints above `.page`.                                                                |
| R1-02   | fixed: hand-written parser replaced by `util.parseEnv` on the root `.env`, `PUBLIC_` filter kept; comment states that `.env.<mode>` files are not read, so `site` and CSP don't vary by mode. |
| R1-03   | fixed: removed the `htmlLang`/`ogLocale` test and the `breakpoints` constants test; the `matches()` test stays.                                                                               |

## Validation

- `git merge main`: clean (T-012/013/015/018, T-022 included); `pnpm install --frozen-lockfile` ok.
- `format:check` ok; `pnpm test`: contracts 153, server 263, web 98, all passed.
- **Caveat:** `eslint`, `astro check` and `astro build` report errors on `parseEnv` in `astro.config.ts` **on this machine only**. A stray `C:\Users\saltv\Desktop\node_modules\@types\node` (v14, outside the repo) is picked up as the primary `@types/node` and lacks `parseEnv`. With the repo's own types (`tsc --noEmit -p apps/web --typeRoots <repo>/node_modules/.pnpm/@types+node@24.19.2/node_modules/@types`) the config type-checks clean. Removing or renaming that stray directory (or adding `typeRoots` to `apps/web/tsconfig.json`, a T-016 file) makes `pnpm verify` green here; CI is unaffected.

- **Update:** added `@types/node@24.19.2` (exact, same as the server) as an `apps/web` devDependency so `parseEnv` resolves in-repo; `pnpm verify` is now fully green (0 errors, contracts 153 / server 263 / web 98 tests, build ok).
