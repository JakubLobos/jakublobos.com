# T-096: Paper city behind the hero

- **Wave:** 9 · **Size:** L · **Decision:** D-37, ADR-0019
- **Owner request (2026-11-11):** build the sketched 3D city from the design prototype (`papercity/`, not committed) behind the hero, carefully: fast load, smooth on weak devices, one fixed city instead of a random one, keep the idle rebuilds and the intro if they are cheap, own renderer if it loads faster. Apply the prototype's hero layout without changing any copy.
- **Built:**
  - `lib/paper-city/` holds the seeded generator with fixed per-building buffer slots, the camera with its horizon shift, and the shaders. It has no DOM. Tests cover determinism and slot capacity.
  - `scripts/paper-city.ts` is the `<paper-city>` WebGL2 element, with two draw calls, pauses, reduced motion and a 30 fps idle. `scripts/paper-city-loader.ts` lazy-loads it after load and idle, and skips it with Save-Data or forced colours.
  - `components/decor/PaperCity.astro` places the city: full-bleed, bottom mask, tilt-shift blur on desktop only, fade-in, hidden in forced colours and print.
  - The right-side social links and the desktop header navigation (with the language switcher) each sit in a paper capsule, so they stay legible over the city (D-38).
  - Hero: mascot removed (it stays on 404), top-aligned, `--hero-*` tokens, buttons kept on one row, compact buttons and full-screen hero on phones. The top paint drips are hidden on phones.
- **Validation:** `pnpm verify`; screenshots at 390, 1440 and 1920 (EN and PL), mid-intro and with reduced motion.
