# Design analysis — `docs/design/design.html`

The design is the **primary visual source of truth**. This document translates it into implementable specifications. Exact token values live in [`design-system.md`](design-system.md).

## 1. What the file is

`design.html` (1.9 MB) is a self-unpacking **Claude Design bundle**:

- A loader script decodes a JSON manifest of base64 or gzip assets (34 WOFF2 font files, React 18.3.1 UMD, ReactDOM, and the Claude Design "dc-runtime").
- It then swaps in a JSON-encoded HTML template.
- The template uses the dc-runtime's templating dialect: `{{ binding }}`, `<sc-if>`, `<sc-for>`, `style-hover` / `style-active` / `style-focus` pseudo-state attributes, and a `class Component extends DCLogic` script holding all behaviour and content.

**The readable source is extracted to [`design/extracted/design-source.html`](design/extracted/design-source.html)** with the font-face blocks stripped. Read that file, not the bundle. Line references below point to it.

The bundle is self-contained (no external requests except a harmless `preconnect`) and renders offline. It was rendered with Chrome 1440×900, 1024×768, 768×1024, and 390×844 with no console errors. Screenshots are in [`design/screenshots/`](design/screenshots/).

> **Redaction (D-25):** the owner's phone number in `design.html`, the extracted source, and all screenshots is replaced with the placeholder `+48 000 000 000`. The real number is never committed; on the live site it's revealed only after a bot check (ADR-0015).

> The prototype's implementation details (React, inline styles, JS-driven breakpoints) are **not** to be copied. Reproduce the _visual result and behaviour_ with semantic HTML, CSS, and small framework-free scripts ([`architecture.md`](architecture.md)).

## 2. Page structure

```
<div page-wrapper>          grid background, min-height 100vh, overflow-x: clip
  <header sticky>           logo · nav (≥760) | Menu button (<760)
  <TopDrips fixed>          6 paint drips, left: clamp(160px,19vw,300px), parallax up
  <SocialAside fixed>       ≥980 only
  <CustomScrollbar fixed>   ≥760 only, aria-hidden
  <main#top max-w 1000>
    Hero · MarqueeBands(full-bleed) · #experience · #projects · #skills · #guestbook · #contact
  </main>
  <BottomDrips absolute>    bottom-right of wrapper, scale .6 on mobile
  <footer max-w 1000>
  <CookieBanner fixed>      when no consent stored and menu closed
  <MobileMenu dialog>       full-screen
  <GuestbookModal dialog>   after a successful submit
</div>
```

Content widths: `main` and `footer` are `max-width: 1000px`, centred, with side padding `clamp(56px,6vw,72px)` (≥ 980 px) or `clamp(20px,5vw,40px)` (< 980 px). Marquee bands break out to full viewport width (`width: 100vw; margin-left: calc(50% - 50vw)`).

**Background layering.** The page wrapper paints the grid. `#projects` and `#skills` paint a solid `--bg` full-bleed (`box-shadow: 0 0 0 100vmax var(--bg); clip-path: inset(0 -100vmax)`), so the grid and drips are hidden behind those two sections (see `desktop-1440-skills.png`). Reproduce this.

**Z-order** (low → high): drips 1 · main/footer 2 · social aside 3 · header 4 · custom scrollbar 5 · cookie banner 8 · mobile menu 9 · modal 10.

## 3. Responsive behaviour

The prototype switches layouts in JavaScript. In production these are **CSS media queries** (JS only where behaviour, not layout, changes).

| Name      | Condition                             | Effects                                                                                                                            |
| --------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `mobile`  | width < 760 px                        | Burger "Menu" replaces the nav; custom scrollbar hidden; bottom drips scaled 0.6; cookie banner insets 12 px and spans full width. |
| `narrow`  | width < 980 px                        | Social aside hidden; side padding `clamp(20px,5vw,40px)`; footer bottom padding 120 px (clears the drips).                         |
| `compact` | width < 820 px **or** height < 760 px | Experience switches from sticky-scroll mode to a stacked list.                                                                     |

Fluid type and spacing use `clamp()` throughout, so there are no other breakpoints. Contact uses `grid-template-columns: repeat(auto-fit, minmax(min(100%,300px),1fr))`, giving 2 columns when wide and 1 when narrow.

## 4. Component specifications

Line numbers refer to `design/extracted/design-source.html`.

### 4.1 Header (L34–52)

- Sticky, `top: 0`, z 4, flex space-between. Padding `clamp(14px,2.4vw,24px) clamp(20px,4vw,56px) clamp(12px,2vw,20px)`. **Transparent background** (see defect DF-1).
- Logo: 2-column grid. `{}` in JetBrains Mono 15/1.55; "JAKUB<br>ŁOBOS." in Poppins 600 18/1.3, letter-spacing .02em.
- Nav: 15 px links, padding 6 × 12, radius 6, hover/current background `--hover` (150 ms). Gap `8px clamp(4px,1vw,12px)`, margin-right −12 px. The current section is the last section whose top is above 40 % of viewport height.
- Menu button (< 760): Ubuntu 500 16, min-height 44, padding 0 16, `--surface` background, 2 px ink border, radius 8, shadow `0 4px 0 ink`. Active state: translateY(3px), shadow `0 1px 0`. Icon: 3 bars (16/16/10 × 2 px).

### 4.2 Mobile menu (L342–379)

Full-screen dialog (z 9) with the grid background and its own top drips. Top row: logo plus "× Close" (same button style). Nav: numbered rows (`01`–`05` mono 12 muted; labels in Rubik Doodle Shadow `clamp(34px,10vw,48px)`), 1 px `--line` separators. Bottom: "Reach me out" primary button (mailto) and an uppercase socials row (12 px, letter-spacing .08em). Body scroll is locked while open. It closes on Escape, Close, any link click, or a resize to ≥ 760.

### 4.3 Social aside (L65–71)

Fixed, right `clamp(16px,3vw,40px)`, vertically centred, z 3. Links GitHub, LinkedIn, Email: 12 px uppercase, letter-spacing .08em, `writing-mode: vertical-rl`, padding 12 × 6, radius 6, hover `--hover`.

### 4.4 Custom scrollbar (L72–81, logic L463–488)

Fixed `top:14px; bottom:14px; right:8px; width:18px`, z 5. Track: 2 px dashed `--line2` line with two slightly rotated ink end caps. Thumb: 16 px wide, height `max(56, track × vh / docHeight)`, `--surface` background, 2 px ink border, hand-drawn radius `255px 15px 225px 15px/15px 225px 15px 255px`, shadow `2px 3px 0 ink`, three tilted grip lines. Its Y position follows scroll progress, with a tiny wobble rotation `sin(p×9)×1.2deg`. Hover/drag background is yellow. It is draggable (pointer events, `touch-action:none`, `user-select:none` while dragging), and clicking the track smooth-scrolls there. It is hidden when the document isn't scrollable. The native scrollbar is hidden (`scrollbar-width:none`, `::-webkit-scrollbar{display:none}`).

### 4.5 Paint drips (L54–63, L309–318, modal L383–390)

Six columns, 22 px wide, colours red, coral, yellow, purple, violet, blue.

- **Top** (fixed): heights 48/90/64/90/166/118 px, radius `0 0 11px 11px`, at `left: clamp(160px,19vw,300px)`. On scroll it translates up by `t × 180px`, where `t = min(1, scrollY / experienceTop)`.
- **Bottom** (absolute, bottom-right of the page): reversed order, heights 120/168/90/64/90/48, radius `11px 11px 0 0`, scale 0.6 on mobile with transform-origin bottom right.
- **Modal**: 14 px wide, heights 22/34/26/34/44/30, centred at the top edge.
- The menu has a copy of the top drips (static).

### 4.6 Hero (L85–112)

Section: `min-height: calc(100svh - 240px)`, padding 40/32, centred column, gap 28.

- **Mascot** (156 × 124, `aria-hidden`), built from absolutely positioned CSS shapes: a yellow organic blob, a body with a double hand-drawn outline, two legs, brows, two eyes (26 × 28 and 28 × 28) with 10 × 11 pupils, striped red blush cheeks, a smile, and 3 motion ticks. Hover: `translateY(-5px) rotate(-3deg)` with a spring `cubic-bezier(.3,1.6,.5,1)` 250 ms. **Pupils** follow the pointer: offset = direction × `min(7, distance/25)` px. **Blink**: scaleY 1 → .1 → 1 over 180 ms, first after 2 s, then every 2.5–6 s at random.
- H1: Rubik Doodle Shadow 400, `clamp(40px,6vw,68px)`/1.1, `text-wrap: balance`.
- Intro: `clamp(17px,1.6vw,20px)`/1.7, max-width 560. "react" and "typescript" in blue 500. "figma" with a marker highlight (`linear-gradient(transparent 55%, #f9c9c9 55%, #f9c9c9 90%, transparent 90%)`, padding 0 4).
- Divider: 40 × 1 `--line2`.
- CTAs (gap 16, wrap): **primary** "Reach me out" → `#contact`; **secondary** "Get my resume".

### 4.7 Marquee bands (L114–129, L543–549, L591–595)

Full-bleed section with `height: clamp(160px,17vw,220px)`, overflow hidden, `aria-label="Skills and about me"`. Two overlapping bands (same grid cell), each 115vw wide, `--bg` background, 2 px ink top/bottom borders, padding 11 px 0. Band A rotated −4° and band B +3°.

- Items: `clamp(15px,1.5vw,19px)`/1.2, weight 500, nowrap, gap 20, followed by a 7 px dot.
- Band A: 12 tech words. The **word** cycles through colours [red, coral, purple, violet, blue] and the dot is ink.
- Band B: 7 facts in ink. The **dot** cycles through all 6 paint colours.
- Each list is duplicated ×4 to loop seamlessly. Animation: A translates −50% → 0, B 0 → −50%, 45 s linear infinite (Web Animations API in the prototype; use CSS keyframes in production). Hovering a band pauses it. With reduced motion there is no animation.

### 4.8 Experience (L132–172, L560–589, L639–642)

- Header: eyebrow `01 — EXPERIENCE` (mono 13 muted, letter-spacing .06em), h2 "Where I work" (doodle `clamp(34px,4vw,46px)`/1.15). Gap 20; header-to-body gap 48.
- **Sticky mode**: wrapper height `(3×80+20)vh = 260vh`; inner stage `position: sticky; top: 0; height: 100vh`, vertically centred, padding `clamp(48px,8vw,64px) 0`. Grid `minmax(0,280px) minmax(0,1fr)`, gap `clamp(32px,6vw,80px)`.
  - Progress `p = clamp(0,1, −rect.top / (rect.height − innerHeight))`; `active = min(n−1, floor(p×n))`.
  - Rail: padding-left 32. 1 px `--line2` track and a 3 px ink fill with height `(100% − 16px) × active/(n−1)` (80 ms linear). Dot: 11 px circle with a 2 px border in the entry colour, filled when `i ≤ active`, scale 1.3 when active, `0 0 0 4px --bg` halo. Each entry is a button: date (mono 12) and org (17/500). The ink is `--ink` when active and `--faint` otherwise. Clicking scrolls to `top + total × ((i+.5)/n)`.
  - Panel: all entries stacked in one grid cell. Active: opacity 1, translateY 0. Before: −16 px. After: +16 px. Opacity 0 and `pointer-events: none` when inactive; 350 ms ease. Content: meta label (mono 12 in the entry colour: `EXPERIENCE` / `EDUCATION`), h3 24/500/1.3, sub 14 muted, bullet list 15/1.7 `--body` max-width 600, gap 8.
- **Compact mode**: no rail, auto height, all entries visible stacked (gap 56), meta = `KIND · DATE`.
- Entry colours: Peryskop violet `#7b5cff`, Vitresoft blue `#2e88d0`, WSB-NLU red `#e05a6a`.

### 4.9 Projects (L174–196)

Solid-background section, padding `clamp(64px,10vw,96px) 0`, gap `clamp(32px,5vw,48px)`. Eyebrow `02 — PROJECTS`; h2 "I'm specializing in making web-apps" (max-width 520). Rows: grid `clamp(32px,6vw,48px) 1fr`, column gap `clamp(12px,2.4vw,24px)`, padding 28 0, 1 px `--line` bottom border, baseline aligned. Number in mono 13 muted. Body is a flex-wrap of: [title 19/500/1.35, description 15/1.7 `--muted2` max-width 560, `flex: 1 1 340px`] and [org 13 ink, tags mono 12 `#1a7fc0`, `flex: 0 1 200px`].

### 4.10 Skills (L198–211)

Same section shell. Eyebrow `03 — SKILLS`; h2 "My toolbox". Rows: flex-wrap, gap `6px 32px`, padding 22 0, `--line` border. Group label: `flex: 0 0 180px`, mono 12 uppercase, letter-spacing .06em, muted. Items: `clamp(16px,2vw,18px)`/1.7, word-spacing .15em, text separated by `  /  `.

### 4.11 Guestbook (L213–239, L497–507, L598)

Centred column, padding `clamp(64px,10vw,96px) 0`, gap `clamp(36px,6vw,56px)`. Eyebrow `04 — GUESTBOOK`; h2 "I love connecting people through the power of frontend" (max-width 640, balanced).

- **Last visitor**: label `THE LAST VISITOR SAID` (mono 12 muted), quote `clamp(24px,3.2vw,36px)`/1.45/500, balanced, in a marker highlight (tint from 55 % to 92 %, padding 0 6, `box-decoration-break: clone`, 300 ms). Container min-height 120 (reserve it to avoid layout shift).
- **Form** (max-width 640, gap 24): the input row has a 2 px ink bottom border, the input (17/1.5, maxlength 120, placeholder "Leave your mark for the next visitor…", `aria-label="Your message"`), and a counter (mono 12 `--faint`, `n/120`). The bottom row (space-between, wrap, gap 20) has the paint radiogroup "Pick your paint" (6 swatches: a 40 × 40 hit area around a 24 px circle; the selected one gets a ring `0 0 0 3px --bg, 0 0 0 5px ink`) and the "Leave a mark" primary button.
- Paints (name, swatch, tint): Red `#e05a6a` / `rgba(224,90,106,.35)`; Coral `#ff7a5c` / `rgba(255,122,92,.4)`; **Yellow (default)** `#fdf25c` / `rgba(253,242,92,.85)`; Purple `#a334d0` / `rgba(163,52,208,.3)`; Violet `#7b5cff` / `rgba(123,92,255,.32)`; Blue `#2e88d0` / `rgba(46,136,208,.32)`.
- **Modal** (L380–398): overlay `rgba(43,43,43,.28)`; card max-width 460, `--surface`, 2 px ink border, radius 12, shadow `0 10px 0 ink`, padding 40/32/32, centred, gap 20. Contents: mini drips, eyebrow `IN REVIEW`, h3 "Thanks for your mark!" (doodle 34), the submitted text in its tint (18/500), body copy "Your message is waiting for a quick review. Once approved, it will greet the next visitor." (14/1.7 `--muted2`, max-width 340), and a "Got it" primary button. Closes on button, Escape, or backdrop click.
- Prototype behaviour to **replace**: it has no network call, and the "last visitor" comes from `localStorage` or a hard-coded seed "Love the paint drips, made me smile!". Production: [`guestbook-moderation.md`](guestbook-moderation.md).

### 4.12 Contact (L241–306, L420–446, L606–623)

Two-column auto-fit grid, gap `clamp(48px,7vw,80px)`, padding `clamp(64px,10vw,96px) 0 clamp(80px,12vw,140px)`.

- Left: eyebrow `05 — CONTACT`; h2 "Let's build something"; lead (15/1.7 `--muted2`, max-width 380); `<dl>` 2-column grid (gap 12 × 24, 15 px) with `<dt>` in mono 12 muted and `<dd>` as links (`mailto:`, GitHub, LinkedIn) plus plain "Polish (native), English (B2)". **PHONE (changed, D-24):** the `<dd>` holds a text button "Show number" styled exactly like the other `<dd>` links (15 px ink, hover `--color-primary`, focus ring). States: idle → verifying ("Verifying…", `aria-busy`; the Turnstile widget appears below the row only if interaction is needed) → revealed (`tel:` link with the formatted number, focused, announced politely) → failed (muted line "Couldn't verify. Try again." + the button again). No-JS: "Use the contact form or email." in muted text.
- Right: form (`noValidate`, gap 28). Each field is a `<label>` column (gap 6) with: label row (mono 12 letter-spacing .06em muted; the message field also shows `n/1000` on the right), the field (17/1.5, transparent background, 2 px bottom border: ink, error `#c23b4c`, focus `#2a64e0`, 150 ms), and an error line (13/1.5 `#c23b4c`, `role="alert"`).
  - Name: `autocomplete=name`, maxlength 60, placeholder "Jane Doe". Email: `type=email`, `inputmode=email`, maxlength 120, placeholder "jane@company.com". Message: textarea, rows 3, min-height 94, auto-grows, no resize, maxlength 1000, placeholder "Tell me a bit about your idea…", Ctrl/Cmd+Enter submits.
  - Validation (prototype L420–428). Name: trimmed length ≥ 2, else "Please tell me your name.". Email: required ("I need your email to reply.") and must match `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` ("That email doesn't look quite right."). Message: trimmed length ≥ 10, else "A few more words, please (min. 10 characters).". An error shows once the field was blurred non-empty, or after a submit attempt. Submit focuses the first invalid field.
  - Buttons: min 210 × 52. **Idle**: primary "Send message". **Sending**: background `#3570ea`, shadow `0 2px 0`, translateY(4px), spinner (16 px, 700 ms), "Sending…", `aria-busy`, cursor progress, inputs disabled. **Sent**: yellow background, ink border and shadow, check icon, "Message sent", `aria-disabled`. Status text (`aria-live=polite`, 13 muted): "Sending your message…" / "Thanks! I'll get back to you at {email}.". "Send another" is a text button with an ink underline that turns blue on hover.

### 4.13 Animated typing fields ("mirror" technique) (L408–419)

All four text fields (guestbook input, name, email, message) render their real `<input>`/`<textarea>` with **transparent text and an ink caret**. An `aria-hidden` overlay "mirror" shows the same value, splitting each word into `inline-block` character spans that animate with `twIn` (from `translateY(.6em) rotate(4deg)`, opacity 0, to normal; 240 ms `cubic-bezier(.2,.8,.2,1)`). Words are `nowrap` spans so line-wrapping matches the field. The mirror's scroll position syncs with the field. Kerning and ligatures are disabled on both so glyph positions match. With reduced motion, `animation: none`.
**Production notes:** only _newly typed_ characters should animate (re-rendering every span on each keystroke is wasteful). In `forced-colors` mode, and when the mirror can't be maintained, show the native text instead (see [`design-system.md`](design-system.md#28-motion)).

### 4.14 Cookie banner (L324–341, L489, L539–540, L626–627)

Fixed bottom-left (24 px; on mobile 12 px left, right, and bottom, full width), max-width 380, z 8, `--surface`, 2 px ink border, radius 12, shadow `0 8px 0 ink`, padding 22/22/20, gap 14. Contents: CSS cookie icon (40 px, `#e8b778` with `#5a3a22` chips and a bite mask), `COOKIES` label, text (14/1.65 `--body`), and the buttons "Accept" (primary, small) and "Only essential" (secondary, small). Small buttons: min-height 44, 15 px, padding 10 × 18, shadow `0 4px 0`, hover `0 5px 0` translateY(−1px), active translateY(3px) `0 1px 0`. Appears 900 ms after load; persisted under `localStorage['jl-cookies']` as `all` or `essential`.

### 4.15 Footer (L320–323)

`max-width 1000`, padding `24px {side} {40px | 120px when narrow}`, flex space-between wrap, 13 px muted. Contents: "© 2026 Jakub Łobos" and "Back to top ↑".

### 4.16 Buttons (shared)

| Variant                                                            | Base                                                                                                                   | Hover                                                                    | Active                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------- |
| Primary                                                            | Ubuntu 500 17, padding 12 × 24, radius 8, background `#2a64e0`, white, 2 px `#1a3f94` border, shadow `0 6px 0 #1a3f94` | background `#3570ea`, translateY(−2px), shadow `0 8px 0`                 | translateY(5px), shadow `0 1px 0` |
| Secondary                                                          | same metrics, `--surface` background, ink text, 2 px ink border, shadow `0 6px 0 ink`                                  | yellow `#fdf25c` background, `#1f1f1e` text, translateY(−2px), `0 8px 0` | translateY(5px), `0 1px 0`        |
| Small (cookie)                                                     | 15 px, padding 10 × 18, min-height 44, shadow `0 4px 0`                                                                | translateY(−1px), `0 5px 0`                                              | translateY(3px), `0 1px 0`        |
| Chrome (Menu/Close)                                                | Ubuntu 500 16, min-height 44, padding 0 16, `--surface`, ink border, `0 4px 0 ink`                                     | —                                                                        | translateY(3px), `0 1px 0`        |
| Transitions: transform, box-shadow, and background at 120 ms ease. |

## 5. Global styles from the design (L17–29)

`html { scroll-behavior: smooth; scroll-padding-top: 88px }` (auto with reduced motion). `::selection { background:#fdf25c; color:#1f1f1e }`. Placeholders are `--faint`, opacity 1. Links: ink, no underline, hover `#2a64e0`. Body: Poppins, `--bg`, antialiased.

## 6. Defects and gaps found in the prototype

| ID    | Finding                                                                                                                                                   | Evidence                                    | Proposed handling                                                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| DF-1  | The sticky header is transparent, so content scrolls under it and collides with the nav.                                                                  | `desktop-1440-contact-errors.png`           | **D-16 answered:** translucent background after scroll **on mobile only** (< 760 px); desktop stays transparent as designed.                          |
| DF-2  | Several text colours fail WCAG AA contrast.                                                                                                               | [`research.md`](research.md#contrast-audit) | **D-01 answered:** approved minimal darkening ([design-system §4](design-system.md#4-accessibility-adjustments-approved-d-01)).                       |
| DF-3  | No visible focus styles for links and buttons (inputs only change underline colour).                                                                      | Source                                      | Add a `:focus-visible` ring (low-risk addition, D-19).                                                                                                |
| DF-4  | The marquee can only be paused by mouse hover (WCAG 2.2.2).                                                                                               | Source                                      | **D-11**: tap/click toggles pause plus a focusable pause button.                                                                                      |
| DF-5  | The paint picker uses `button role=radio` without arrow-key handling.                                                                                     | L231–234                                    | Native `<input type="radio">` group, visually identical (D-20).                                                                                       |
| DF-6  | No guestbook loading/empty/error or submitting states; no contact failure state.                                                                          | Source                                      | **D-12, D-13 answered:** designed states in the existing visual language ([guestbook-moderation §10](guestbook-moderation.md#10-frontend-behaviour)). |
| DF-7  | The "Get my resume" link is `href="#"`.                                                                                                                   | L110                                        | Links to `/resume/jakub-lobos-cv-{locale}.pdf`; the owner adds the PDFs at the end (D-10).                                                            |
| DF-8  | No language switcher, privacy link, cookie-settings link, or skip link.                                                                                   | —                                           | Additions approved (D-08, D-09, D-19).                                                                                                                |
| DF-9  | The cookie text mentions understanding usage, which is true with GA4 + PostHog (D-03).                                                                    | L335                                        | Keep the text.                                                                                                                                        |
| DF-10 | The menu "Reach me out" uses `mailto:` while the hero version links to `#contact`.                                                                        | L371 vs L109                                | Keep as designed (intentional on mobile). Confirm in review.                                                                                          |
| DF-11 | The custom scrollbar `aria-hidden` element is pointer-interactive. Acceptable because native scrolling still works for keyboard and assistive technology. | L72                                         | Keep; never make it focusable.                                                                                                                        |
| DF-12 | The phone number is published as plain text and a `tel:` link, so scrapers can harvest it.                                                                | L249–250                                    | **D-24 answered:** revealed only after a Cloudflare Turnstile check (ADR-0015); redacted in the repo (D-25).                                          |

## 7. Reference screenshots

`design/screenshots/` contains the rendered prototype at desktop 1440, tablet 1024 and 768, and mobile 390, covering: hero (with and without cookie banner), each experience step, projects, skills, guestbook (idle, typing, modal), contact (idle, errors, loading, success), footer, mobile menu, and marquee with reduced motion. These are references for review, **not** pixel-diff baselines; dynamic parts (mascot, marquee, mirror animation) vary between runs.
