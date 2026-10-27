# T-042 review, round 1, phase 1 (orchestrator)

**Verdict: APPROVED for phase 1.** AC-2 (owner visual sign-off) is open; phase 2 (`toHaveScreenshot` baselines) starts after it.

## Checks

- `pnpm verify`: green (implementer). Diff is CSS-only in 3 components plus tools/docs, within the allowed files and the approved `base.css` CR.
- Spot-checked side-by-sides the implementer did not inspect (`tablet-768-hero`, `tablet-1024-guestbook`): they match the design. The only differences are approved additions (EN/PL switcher, guestbook privacy note).
- Fixes reviewed: reduced-motion top drips scroll away with the hero; native scrollbar hidden only ≥ 760 px once `sketch-scrollbar` is defined (`:has(:defined)`); privacy-page desktop header gets a token-based translucent background when scrolled. All are scoped and token-only.

## Findings

- R1-01 RESOLVED elsewhere: PL single-letter words at line ends (9 on `/pl`, 23 on `/pl/privacy`) are because this branch predates T-034 (#2), which adds the NBSPs centrally. Re-check at 390 px after #2 merges, before the baselines.
- R1-02 ACCEPTED: the typing-mirror wrap (T-028 R1-03) isn't a one-line fix; cosmetic only.
- R1-03 NOTE: the forced-colours dot is verified by computed style only; the deep-link CLS couldn't be reproduced (≤ 0.001).
- R1-04 OWNER: the reduced-motion drips behaviour is a judgement call; owner to confirm in the visual review.
