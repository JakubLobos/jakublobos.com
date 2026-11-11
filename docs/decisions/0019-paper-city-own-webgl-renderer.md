# ADR-0019: The hero's paper city uses a small WebGL2 renderer instead of three.js

- **Status:** Accepted (owner decision D-37, 2026-11-11) · **Related:** NFR-03, ADR-0002, ADR-0012

## Context

The owner wants a sketched 3D city behind the hero. The design prototype (`<paper-city>`, three.js 0.160 loaded from unpkg) built the city randomly on each visit. Every building was its own mesh with several materials, plus outline, wireframe and cap objects, and a 2048 px soft shadow map. That is around 1,500 draw calls per frame plus a shadow pass, 130–170 KB gzip of library code (NFR-03 allows 35 KB of first-party JS on the home page), a CSP violation (unpkg is not an allowed script source), and seconds of main-thread work on weak phones. Its hatching and shadows were also invisible in the final frame, because the hemisphere light kept every face above the hatching threshold.

## Decision

- **No library.** `scripts/paper-city.ts` is a WebGL2 renderer with two programs (fills and lines). The lazy chunk is about 10 KB gzip.
- **One fixed city.** `lib/paper-city/city.ts` generates it from a seeded PRNG (`CITY_SEED`), so every visitor sees the same, approved city. The generator is cheaper to ship than the geometry it produces (about 25 ms to run on desktop).
- **Animation lives in the shaders.** Each vertex carries its kind and object id. A per-object RGBA32F state texel holds start times and the clip range. The intro wave, the grey wireframe, the paper fill with its cap, the slab pop-in, the idle rebuilds and the cars are all computed from `uTime` in the vertex shader. Per frame the CPU sets two uniforms and issues two draw calls.
- **Idle rebuilds without new allocations.** Every building owns a fixed slot in the vertex, index and line buffers. A rebuild regenerates that building into its slot (`bufferSubData`) and updates one texel. Unused slot vertices are hidden in the shader.
- **Same look, less work.** Flat paper colours, jittered ink outlines and window strokes are drawn procedurally in the fragment shader (no textures). Shadows and hatching are dropped because they did not show in the prototype's final frame.
- **Loading and fallbacks.** `paper-city-loader.ts` imports the renderer after `load` plus `requestIdleCallback`. It is skipped with Save-Data and in forced-colours mode. With no WebGL2 the hero keeps the paper grid. Reduced motion renders the finished city once. Animation pauses off-screen and in hidden tabs, and runs at 30 fps after the intro. The pixel ratio is capped at 1.5.

## Alternatives

- **three.js, bundled and optimised** (merged meshes, baked shadows): still about 120 KB gzip for the renderer alone. Rejected for load cost.
- **Pre-rendered image or video:** smallest and simplest, but it loses the build-up intro and the living city the owner asked for. A poster image would also become the LCP element.
- **Pre-baked geometry file:** hundreds of KB versus about 7 KB of generator code. Rejected.

## Consequences

- Custom GL code to maintain, about 600 lines across `lib/paper-city/*` (camera, geometry primitives, city layout, palette, shaders) and `scripts/paper-city.ts`.
- Colours are design tokens (`--city-*`, accent roofs reuse `--paint-*`). The renderer reads them with `getComputedStyle` and passes them to the shaders as uniforms (`lib/paper-city/palette.ts`). If a token is missing, the city doesn't start.
- `city.test.ts` guards determinism and the slot capacities (a thousand rebuilds).
