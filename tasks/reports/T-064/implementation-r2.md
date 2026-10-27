# T-064: Implementation report, round 2

- **Branch:** `task/T-064-field-focus`
- **Status claimed:** READY_FOR_REVIEW

## Findings addressed

- **R1-01 fixed.** `input-modality.ts` now decides at focus time: `pointerdown` and `keydown` only update a module-local `last`; a capture `focusin` writes `data-modality`. Typing after a click no longer flips it. No input yet leaves the attribute absent, so the ring stays.
- **R1-02 fixed.** The `base.css` change is reverted. The suppression is `:global(:root[data-modality='pointer']) .control:focus-visible` in `TypingField.astro`, so radios and the honeypot are unaffected.
- **R1-03 fixed.** The `TypingField` header comment says `bare` draws neither the line nor the ring.

## Verification (Playwright, throwaway, port 4404, process killed)

```
a click guestbook + type "abc": row none, control none, fill matrix(1,0,0,1,0,0) (filled)
b Tab into guestbook + type:    row solid (ring stays)
c click contact name, Tab:      activeElement contact-email, outline solid
d click contact name + type:    outline none
```

`pnpm verify` green (budgets OK: JS 15.7/35 KB, CSS 12.5/25 KB).
