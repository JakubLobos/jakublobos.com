# T-025: Implementation report, round 1

- **Branch:** `task/T-025-marquee`
- **Status claimed:** READY_FOR_REVIEW
- **Agent / model:** claude-sonnet-5-5

## Summary

Filled the T-021 `MarqueeBands.astro` stub with the two rotated, counter-scrolling bands. Motion is pure CSS (`marquee-ltr`/`marquee-rtl`, `--duration-marquee`), opt-in under `prefers-reduced-motion: no-preference`. A small `<marquee-bands>` custom element only toggles `data-paused` (click/tap per band, plus the D-11 keyboard button for both). The bands are `aria-hidden`; a visually hidden `<p>` carries the single text alternative.

## Files changed

| File                                                  | Change                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/web/src/components/sections/MarqueeBands.astro` | modified: stub replaced by the section, bands, pause control and styles         |
| `apps/web/src/scripts/marquee.ts`                     | added: `marquee-bands` custom element (pause toggling, AbortController cleanup) |
| `apps/web/src/content/marquee.ts`                     | added: band A words (locale-neutral), band B facts EN + PL                      |
| `apps/web/src/i18n/messages/marquee.ts`               | added: button labels and summary labels, EN + PL                                |
| `tasks/reports/T-025/screenshots/*.png`               | added: 390 / 768 / 1024 / 1440 (reduced motion) and 1440 animating              |

## Acceptance criteria

| #    | Criterion (short)                 | Status | Evidence                                                                                                                                                                                                                                                   |
| ---- | --------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Visual parity, height, crossing   | yes    | `screenshots/marquee-1440-reduced.png` vs `docs/design/screenshots/desktop-1440-marquee-reduced-motion.png`: same positions, colours, crossing. Height is `clamp(160px,17vw,220px)`. 390 shot included.                                                    |
| AC-2 | Seamless loop                     | yes    | Headless Chrome (CDP): `track.children[n/2].offsetLeft` = 3111 vs `scrollWidth/2` = 3110.5 (sub-pixel rounding); keyframes translate exactly 50%.                                                                                                          |
| AC-3 | Hover pause, click toggle, button | yes    | CDP run: click band A -> `paused`, click again -> `running`; button -> both `paused`, `aria-pressed=true`, label "Play animation"; again -> both `running`, `aria-pressed=false`. Hover rule is under `@media (hover: hover)` (not exercised in headless). |
| AC-4 | No horizontal scroll              | yes    | CDP at 1440: `documentElement.scrollWidth === clientWidth` (1424). Section is `overflow: hidden`. Only measured at 1440; 390/768/1024 screenshots show no overflow.                                                                                        |
| AC-5 | One concise text alternative      | yes    | DOM dump of `/pl`: bands `aria-hidden="true"`, one `visually-hidden` `<p>` ("Technologie: React, ... O mnie: ...").                                                                                                                                        |

## Validation output

```
$ pnpm verify
format:check OK, eslint OK, astro check 0 errors / 0 warnings / 0 hints, vitest OK, astro build "6 page(s) built"
exit code 0
```

(`pnpm preview` not run: the section is static CSS plus a custom element, verified against the Astro dev server and the production build.)

## Tests added

None. There is no extractable logic: the script only toggles attributes, which was verified in a real browser (see AC-3). A DOM test would need a jsdom dependency that is not in the approved list.

## Screenshots

`tasks/reports/T-025/screenshots/marquee-{390,768,1024,1440}-reduced.png` (Chrome headless with `--force-prefers-reduced-motion`) and `marquee-1440-animating.png`. They show the stubbed page (header, hero and other sections are still T-023/T-024 stubs), so only the band region is comparable with the design. The 390 shot is clipped by the 700 px window height.

## Assumptions

- Band geometry (115vw width, 11px padding, -4deg/3deg tilt, 7px dot, section height clamp) sits in a local custom-property block as decor geometry (design-system §3 rule 1). If the reviewer disagrees, these become tokens via a CR.
- The word colours skip yellow (as in the design); band B dots use all six paints. Colours are assigned per half, like the prototype, so both halves of the track are identical.
- The button label swaps ("Pause animation" / "Play animation") and `aria-pressed` is `true` while paused, as the spec states. `aria-pressed` is "all bands paused".
- The control is `hidden` until the custom element upgrades (no JS, no dead button) and is `display: none` under reduced motion, where there is nothing to pause. It reuses `ui/Button` (secondary, sm) per design-system §3 rule 4.
- Hover pause is limited to `(hover: hover)` so a tap does not leave a sticky hover that fights the click toggle.
- Summary text uses "; " between facts because one fact contains a comma ("Kraków, Poland").

## PL drafts for owner review

`content/marquee.ts` band B (PL): "Kraków, Polska", "Tworzę dla ludzi", "Jedyny frontendowiec w dwóch zespołach", "Mentor dla stażystów", "Student informatyki", "Polski i angielski". `i18n/messages/marquee.ts` PL: "Zatrzymaj animację", "Włącz animację", "Technologie", "O mnie".

## Deviations from spec or design

- None. The marquee keeps the design colours per D-01.

## Change Requests

- None.

## Open issues and follow-ups

- The branch was initially cut from an older commit; I reset it to `main` (9d90a36) before any work, so the diff is only T-025.
- Lint reports an unresolved `import.meta.env` type in `lib/api/client.ts` on a fresh worktree until `astro sync` has generated `.astro/types.d.ts`; unrelated to this task (verify is green after `astro sync`).
