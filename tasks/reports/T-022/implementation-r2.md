# T-022: Implementation report, round 2

- **Branch:** `task/T-022-ui-primitives`
- **Status claimed:** READY_FOR_REVIEW (pre-merge fixups after the approved round 1)

## Previous findings

| Finding | Resolution                                                                                                                                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-01   | fixed: `--hl-end: 92%` added next to `--hl-start` in `tokens.css`; `Highlight.astro` uses it. The spinner's 40% track alpha is a `color-mix` on `currentColor`, not a palette colour, so it stays inline with a why-comment. |
| R1-02   | fixed: `--busy-press`/`--busy-sink` renamed to `--press-busy`/`--sink-busy` (tokens and `Button.astro`). `ChromeButton.astro` bar radius is now the literal `1px` instead of borrowing `--border-hairline`.                  |

Orchestrator decision recorded: `disabled` = the design's "sent" look (`aria-disabled`, focusable) is accepted.

`main` was merged (no conflicts) and `pnpm install --frozen-lockfile` re-run.

## Validation

See the commit message and the orchestrator reply for the `pnpm verify` summary.
