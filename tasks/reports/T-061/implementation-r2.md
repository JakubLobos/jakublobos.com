# T-061 implementation report (round 2)

- R1-01: the WAAPI timings now come from the motion tokens through `getComputedStyle(card)` (`tokenTiming()` in `guestbook-form.ts`, same pattern as `mascot.ts`, with a 150 ms fallback). Re-ink uses `--duration-hover` and `--ease-type`; the accent uses `--duration-panel` and `--ease-standard` (350 ms, previously a 450 ms literal). The values are read once per state change. The literal timings and the "mirror" comment are gone.
- R1-02: `ACCENTS` is `Partial<Record<StatusView['state'], Keyframe[]>>`, looked up through `view ? ACCENTS[view.state] : undefined`.
- Evidence: `pnpm verify` exit 0 (budgets OK, critical JS 14.6/35 KB). No behaviour change otherwise.
