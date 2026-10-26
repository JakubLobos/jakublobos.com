# T-016: Implementation report, round 1

- **Branch:** `task/T-016-cf-worker`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5
- Round 1 implements the full spec including the "Round 2 amendment" (emulator, CR-1 rejected, CR-2 accepted). Earlier attempts were discarded; this branch starts from `main` @ `ca4e4f1`.

## Summary

The Worker (`worker/`) is pure and structural (`Env.ASSETS.fetch`), so it runs unchanged in Vitest, the Node edge emulator, and workerd. `security-headers.ts` is the single header source: the Astro integration renders `dist/_headers` from it at build, and the Worker applies the same constants. The emulator reproduces the static-assets behaviour we rely on over `dist/`, and `pnpm preview` runs site (:8787) plus API (:3000).

## Files changed

| File                                                                 | Change                                                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web/security-headers.ts`                                       | added: `SITE_SECURITY_HEADERS`, `ROOT_HEADERS`, `SET_LANGUAGE_HEADERS`, `CACHE_RULES`              |
| `apps/web/integrations/cloudflare-headers.ts` (+ test)               | added: `astro:build:done` writes `dist/_headers`; fails the build over 100 rules / 2000-char lines |
| `apps/web/worker/{negotiate-locale,set-language,index}.ts` (+ tests) | added: pure negotiation, allowlisted `/set-language`, fetch handler                                |
| `apps/web/worker/tsconfig.json`                                      | added: workers-types, excludes tests                                                               |
| `apps/web/edge-emulator/{server,edge,assets,headers-file}.ts`        | added: Node emulator (+ `edge.test.ts`)                                                            |
| `apps/web/wrangler.jsonc`                                            | added: per spec; routes commented                                                                  |
| `apps/web/{package.json,tsconfig.json,astro.config.ts}`              | modified: scripts, `include`, integration registered                                               |
| `apps/server/package.json`, `package.json`, `README.md`              | modified: `preview:topology`, root `preview`, README "Local preview"                               |
| `pnpm-lock.yaml`, `pnpm-workspace.yaml`                              | modified: deps; `allowBuilds` `esbuild: false`, `workerd: false` (see Assumptions)                 |

`public/robots.txt` already contained `Disallow: /set-language` (T-021); no edit needed.

## Acceptance criteria

| #    | Criterion (short)                  | Status | Evidence                                                                                                                                                                                       |
| ---- | ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Worker matrix (`testing.md` §3)    | ok     | `worker/index.test.ts` (GET `/` table, headers, 405, `/set-language`), `negotiate-locale.test.ts`                                                                                              |
| AC-2 | No open redirect                   | ok     | `set-language.test.ts` "sends to=%j to the locale home" for `https://evil.example`, `//evil`, `/\evil`, `%2F%2Fevil`, `/unknown` and more; Worker-level case in `index.test.ts`                |
| AC-3 | `dist/_headers` built; one source  | ok     | `integrations/cloudflare-headers.test.ts` "gives every security header to /* and the Worker emits the same set for /"; `dist/_headers` exists after `pnpm build` (7 headers under `/*`)        |
| AC-4 | Pages, 404, negotiation (emulator) | ok     | curl output below; Worker not invoked for `/pl` (test "serves %s as an asset without invoking the Worker"; live `/pl` has `cache-control: no-cache`, the Worker's `/` has `private, no-cache`) |
| AC-5 | `pnpm preview`, CORS to `:3000`    | ok     | both ports listening after `pnpm preview`; `curl -H 'Origin: http://localhost:8787' localhost:3000/api/health` returned `Access-Control-Allow-Origin: http://localhost:8787`                   |

AC-4/AC-5 were verified against the emulator only; the real-runtime parity check is T-051. `wrangler deploy --dry-run` did bundle the Worker successfully (esbuild, no runtime needed), so `main`, `assets` and the `.ts` imports are valid for wrangler.

## Validation output

```
$ pnpm verify
Checking formatting... All matched files use Prettier code style!
eslint . (no output)
apps/web typecheck: 0 errors
contracts 153 tests, server 263 tests, web 182 tests (11 files) all passed
apps/web build: Complete! (dist/_headers written)
exit=0

$ pnpm --filter @portfolio/web exec vitest run worker edge-emulator integrations
Test Files 5 passed (5)   Tests 83 passed (83)

$ pnpm exec tsc -p apps/web/worker/tsconfig.json   -> clean

$ pnpm preview (then curl, ports 8787/3000)
GET / -H 'Accept-Language: pl'   -> 302 location: /pl, cache-control: private, no-cache, vary: Accept-Language, Cookie, x-frame-options: DENY
GET /                            -> 200 (English), same cache/vary/security headers
GET /pl, /privacy, /pl/privacy   -> 200, cache-control: no-cache, x-frame-options: DENY
GET /pl/nope                     -> 404, body <html lang="pl"> (pl/404.html);  GET /nope -> 404 <html lang="en">
GET /pl/                         -> 307 /pl ;  GET /index.html -> 307 /
GET /set-language?lang=pl&to=https://evil.example -> 302 location: /pl, set-cookie: lang=pl; Max-Age=31536000; Path=/; SameSite=Lax; Secure; HttpOnly
GET /set-language?lang=de        -> 400
GET /..%2f..%2fpackage.json, /%2e%2e/package.json -> 404
```

Processes were killed by PID afterwards; `netstat` showed no listeners on 8787/3000.

## Tests added

- `worker/negotiate-locale.test.ts`: q-values, ties, q=0/malformed q, region subtags, cookie override, invalid cookie, cookie parsing.
- `worker/set-language.test.ts`: cookie attributes, allowlist, open-redirect/encoding variants, absent `to`, invalid `lang`.
- `worker/index.test.ts`: `GET /` matrix, Vary/Cache-Control/security headers on both outcomes, 405, `/set-language` redirect/400, pass-through for other paths.
- `integrations/cloudflare-headers.test.ts`: single-source parity, non-overlapping cache rules, `/` Vary, Cloudflare limits.
- `edge-emulator/edge.test.ts`: `run_worker_first` routing (incl. real `wrangler.jsonc`), html handling and redirects, nearest-404 lookup, content types, `_headers` matching/joining/not applied to Worker responses, traversal.

## Assumptions (low-impact decisions taken)

- **Pins:** `wrangler@4.152.0`, `@cloudflare/workers-types@5.20261023.1` (orchestrator instruction; the task file's `5.20261025.1` is superseded by CR-1 handling). `minimumReleaseAgeExclude` untouched.
- **`ERR_PNPM_IGNORED_BUILDS`:** `pnpm add` wrote placeholder `esbuild`/`workerd` entries into `allowBuilds`; I set both to `false` (CR-2: scripts stay ignored). That is the only edit to `pnpm-workspace.yaml`.
- **Worker fetches `/` from ASSETS, not `/index.html`.** With `auto-trailing-slash`, the binding answers `/index.html` with a redirect to `/`, which the Worker would hand to the client and loop. Both serve the same file. The emulator mirrors the redirect so a regression would show locally. T-051 parity should confirm on real workerd.
- **`_headers` cache rules:** pages are extensionless, so `/*.html` never matches them. The integration adds one `no-cache` rule per built page (`/`, `/pl`, `/privacy`, `/pl/privacy`, `/404`, `/pl/404`), and `/` gets `private` + `Vary`. Rules are disjoint because Cloudflare joins same-name headers from all matches.
- **Non-GET/HEAD** on `/` or `/set-language` returns 405 (not in spec). `/set-language` responses are `Cache-Control: no-store`.
- **`Env.ASSETS` is a structural type**, not `Fetcher`, so the same file type-checks under the web tsconfig and `worker/tsconfig.json` (workers-types conflicts with DOM/Node types, so tests live outside the latter).
- **Cross-platform env in scripts:** pnpm runs scripts through `cmd` on Windows, so `VAR=x cmd` fails. `build:preview` (web) and `preview:topology` (server) set env through a short `node -e` instead of adding a dependency. `build:preview` is an extra web script not named in the task.
- The emulator binds `127.0.0.1` only.

## Deviations from spec or design

- `ASSETS.fetch('/')` instead of `'/index.html'` (see Assumptions).
- Added `build:preview` script in `apps/web/package.json` (allowed file) to build with `PUBLIC_API_BASE_URL` cross-platform.

## Change Requests (shared surfaces / dependencies)

- None. Header-level CSP (non-fetch directives only) and T-021's meta CSP do not conflict, so no reconciliation was needed. `astro.config.ts` only imports and registers the integration.

## Open issues and follow-ups

- Real `wrangler dev` was not run (crashes on this host). Differences between the emulator and workerd (notably whether `ASSETS.fetch` applies `_headers`, and the `/index.html` redirect behaviour assumed above) are to be confirmed by T-051 on Linux.
- `astro.config.ts` meta CSP and Shiki warning at build are pre-existing (T-021).
- The README table row for `pnpm test:e2e` still carries its T-040 marker; untouched.
