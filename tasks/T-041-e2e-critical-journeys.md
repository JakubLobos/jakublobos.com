# T-041: End-to-end critical user journeys

|                          |                                                                        |
| ------------------------ | ---------------------------------------------------------------------- |
| **Wave**                 | 6                                                                      |
| **Depends on**           | T-014, T-015, T-023, T-029, T-030, T-032, T-040                        |
| **Blocked by decisions** | none (analytics assertions use the no-provider / stub path until D-03) |
| **Parallel with**        | T-034, T-042, T-043, T-050                                             |
| **Size**                 | L                                                                      |
| **Requirements**         | FR-03, FR-04, FR-10, FR-11, FR-16, FR-25…FR-29, FR-41, NFR-02, NFR-13  |

## Objective

Prove the critical journeys in a real browser against the production topology, including moderation outcomes, failure modes, accessibility in each state, and no-JS behaviour.

## References

- `docs/testing.md` §4 (the journey table is the minimum)
- `docs/guestbook-moderation.md` §6.2 (fake markers), §10
- `docs/api.md` §5
- `docs/security.md` T1, T2, T16

## Scope

Specs under `e2e/` tagged by area (`@i18n`, `@nav`, `@guestbook`, `@contact`, `@consent`, `@motion`, `@nojs`) implementing every row of `testing.md` §4, plus:

- axe checks in states: menu open, guestbook modal open, contact errors shown, cookie banner shown
- the worker-dependent assertions poll `/api/guestbook/latest` with `expect.poll` (max 5 s) instead of sleeping
- an XSS spec: submit `<img src=x onerror=window.__xss=1>` → after approval the quote shows the literal text and `window.__xss` is undefined
- a phone reveal spec (`@contact`) per `testing.md` §4 "Phone reveal", including a check that the page HTML has no phone number before the reveal

## Allowed files

`e2e/**` (new specs and helpers), `playwright.config.ts` (projects or tags only, if needed).

## Acceptance criteria

- **AC-1** Every journey in `testing.md` §4 has at least one passing spec on `chromium-desktop`; navigation, guestbook, contact, and consent also run on `chromium-mobile` and `webkit-desktop`.
- **AC-2** The suite is deterministic: 5 consecutive full runs pass (`--repeat-each=5` on the guestbook and contact specs), with no `waitForTimeout` except where documented.
- **AC-3** The total suite runtime is under 4 minutes on a typical laptop (report the measured time).

## Validation

```
pnpm test:e2e
pnpm test:e2e --grep "@guestbook|@contact" --repeat-each=5
```

## Definition of done

Standard DoD.
