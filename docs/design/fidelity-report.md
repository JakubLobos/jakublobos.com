# Fidelity report (T-042, phase 1)

Design (left) vs built site (right), `reducedMotion: 'reduce'`, `en-US`. Regenerate with `pnpm preview` and then
`node tools/design/capture-design.mjs --compare` (images land in git-ignored `e2e/visual/compare/`, one PNG per state and viewport,
42 in total). Mascot pupils and the marquee are painted magenta in both images. Deliberate product additions (EN/PL switcher, privacy
note under both forms, Privacy and Cookie settings in the footer, "Show number" instead of a printed phone, empty-database guestbook
quote) are not listed again below.

Severity: MAJOR = visibly wrong or breaks the design intent, MINOR = noticeable on a side-by-side, NIT = sub-perceptual.
**Open MAJOR: 0.** Open MINOR: 1 (Polish orphans, owned by T-034). Sign-off: _pending the owner's review of `compare/`_ (AC-2).

Review coverage: all 1440 px states were inspected image by image; at 390 hero, experience step 2, projects, guestbook, contact, footer
and menu; at 1024 experience step 1 and contact; at 768 hero and compact experience. The remaining images were produced but not
inspected one by one; the owner's pass covers them.

## 1440 x 900

| State                   | Deviation                                                                                                                                                        | Sev   | Status                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| hero, banner            | none beyond the switcher                                                                                                                                         | -     | -                                                                                                 |
| experience 1-3          | the top drips stayed fixed over every section under reduced motion (the design's strip travels out of view)                                                      | MINOR | fixed (F-1)                                                                                       |
| experience 1-3          | inactive timeline entries are `--color-text-muted` (AA contrast), the design's are lighter                                                                       | NIT   | accepted, contrast                                                                                |
| projects, skills        | drips leaked into the 60 px above the solid sections (same cause)                                                                                                | MINOR | fixed (F-1)                                                                                       |
| guestbook, contact      | drips over the transparent sections (same cause)                                                                                                                 | MINOR | fixed (F-1)                                                                                       |
| guestbook typing        | rectangular focus ring around the typing field, the design shows only the underline                                                                              | NIT   | accepted, AGENTS rule 10 (visible focus)                                                           |
| guestbook modal         | none                                                                                                                                                             | -     | -                                                                                                 |
| contact errors          | focus ring on the first invalid field (as above); copy and layout match                                                                                          | NIT   | accepted, same reason                                                                             |
| contact loading/success | none (the tool delays the API 1.8 s to show loading)                                                                                                             | -     | -                                                                                                 |
| footer, marquee         | none                                                                                                                                                             | -     | -                                                                                                 |

## 1024 x 768

| State              | Deviation                                              | Sev   | Status      |
| ------------------ | ------------------------------------------------------ | ----- | ----------- |
| hero, experience 1 | none besides the drips behaviour                       | -     | -           |
| experience 1-3     | fixed drips over the heading (reduced motion)          | MINOR | fixed (F-1) |
| contact            | extra privacy note; fixed drips (reduced motion)       | MINOR | fixed (F-1) |

## 768 x 1024

| State              | Deviation                                                                                   | Sev | Status   |
| ------------------ | ------------------------------------------------------------------------------------------- | --- | -------- |
| hero               | none                                                                                        | -   | -        |
| experience compact | eyebrow crowds the two-line logo in the design and in the build (identical)                  | NIT | accepted |

## 390 x 844

| State                  | Deviation                                                                                                                                  | Sev   | Status                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ----------------------------------- |
| hero                   | none                                                                                                                                       | -     | -                                   |
| experience, projects   | scrolled mobile header has a 90 % background, blur and hairline (the design lets text run under the logo); drips showed through it       | MINOR | header accepted (D-16), drips fixed |
| guestbook, contact     | drips overlapped the section eyebrow (reduced motion)                                                                                      | MINOR | fixed (F-1)                         |
| menu                   | none; the magenta squares in the build's image are the hero pupils masked behind the dialog, a tool artefact                               | NIT   | accepted                            |
| footer                 | extra Privacy and Cookie settings links wrap to a second row                                                                               | NIT   | accepted (product addition)         |
| `/pl`, `/pl/privacy`   | single-letter Polish words end lines (see T-034 below)                                                                                     | MINOR | open, handed to T-034               |

## Fixes made

| ID  | File                                                  | Change                                                                                                                                                       |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-1 | `apps/web/src/components/decor/PaintDrips.astro`      | Under `prefers-reduced-motion: reduce` the top drips are `position: absolute`, so they scroll away with the hero instead of hanging over every section.      |
| F-2 | `apps/web/src/styles/base.css` (CR approved)          | T-031 R1-03: the native scrollbar is hidden only at width >= 760 px and when `sketch-scrollbar` is defined (`html:has(sketch-scrollbar:defined)`).            |
| F-3 | `apps/web/src/components/pages/PrivacyPage.astro`     | The desktop header gets the same 90 % background and blur as the mobile one once scrolled (`data-scrolled`), so it no longer prints over the tables.          |

## Follow-ups assigned to T-042

| Item                         | Outcome                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-031 R1-03 scrollbar        | Fixed (F-2). Not visually checked below 760 px beyond the 390 px captures, where the native scrollbar overlay is not drawn by headless Chromium.                                                                                                                                                                                                                                      |
| Deep-link CLS                | Not reproducible on the current build: layout-shift observer at 1440 x 900 gives 0.001 for `/`, `/#skills`, `/#guestbook`, `/#contact` (one shift in the hero), and 0.000 at 390 px with touch emulation. The report predates the later fixes; no change made. A throttled-network check belongs to T-043.                                                                             |
| Header over privacy tables   | Fixed (F-3), verified by reading the CSS and building; not screenshotted on `/privacy`.                                                                                                                                                                                                                                                                                              |
| T-028 R1-03 typing mirror    | Accepted, not fixed. The wrap difference comes from the mirror's atomic word boxes (see the comment in `TypingField.astro`), so `overflow-wrap: anywhere` is not a one-line fix; the value stays correct.                                                                                                                                                                              |
| T-025 R1-03 forced colours   | Checked with `forcedColors: 'active'`: the band dot computes to `background: rgb(0, 0, 0)` (`CanvasText`), `forced-color-adjust: none`, 7 px, so it stays visible. Computed-style evidence only, no screenshot kept.                                                                                                                                                                    |
| T-034 Polish single letters  | **Open.** At 390 px a single-letter word ends a line 9 times on `/pl` (hero is clean; hits are in the project and experience copy, e.g. "i", "w", "z") and 23 times on `/pl/privacy` (many "Zgodnie z ustawieniami"). Needs non-breaking spaces in the PL copy or a typography step at render time; the copy files are outside T-042's allowed files.                                    |

## Change Requests

- **CR-1 (T-034):** keep single-letter Polish words (a, i, o, u, w, z) attached to the next word in the PL messages and privacy content with U+00A0, then re-run the orphan check at 390 px.
