# T-082: Resume feedback polish

- **Wave:** 8 (go-live) · **Size:** S · **Depends on:** T-079, T-068
- **Owner request (2026-10-28):**
  - Resume outcome messages clear themselves 10 s after they appear; the busy text stays while busy, and a newer message restarts the timer.
  - On a failed, rate-limited or unavailable download the "Get my resume" button shakes like the character-limit counter. The shake lives in one shared helper, `scripts/nudge.ts`, used by `limit-nudge.ts` (with the colour flash) and `resume-download.ts` (without).
  - More space between the buttons and the feedback block: `--space-16`.
- **Allowed files:** `apps/web/src/scripts/{nudge,limit-nudge,resume-download}.ts`, `apps/web/src/components/sections/Hero.astro`, `docs/design-system.md`.
- **Validation:** `pnpm verify`.
