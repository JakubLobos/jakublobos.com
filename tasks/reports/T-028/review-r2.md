# T-028 review, round 2 (pre-merge fixups)

- **Reviewer:** orchestrator (Opus)
- **Verdict:** APPROVED (round 1 was APPROVED)

| Finding                                                 | Status                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| R1-01 MINOR `reset()` leaves counters stale             | Fixed: `reset()` dispatches a bubbling `input` event.                                                                    |
| R1-02 MINOR `type="email"` strips spaces, mirror drifts | Fixed: always `type="text"`; email fields use `inputmode="email"` + `autocomplete="email"` (API change noted for T-030). |
| R1-03 MINOR over-long token wrap                        | Comment and report corrected; backlog item in `tasks/README.md` (T-042).                                                 |
| R1-04 MINOR `ResizeObserver` leak                       | Fixed: disconnected in `disconnectedCallback`.                                                                           |
| R1-05 NIT duplicate test                                | Removed.                                                                                                                 |

Gate C: `pnpm verify` on the squash-merged tree.
