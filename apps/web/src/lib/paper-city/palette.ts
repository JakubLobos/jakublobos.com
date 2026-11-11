// The city's colours are design tokens (tokens.css, --city-* and --paint-*); the renderer reads
// them from the computed style and hands them to the shaders, so the theme stays in one place.

/** Material index -> token; indices match MAT in geometry.ts (1-3 are the window façades). */
export const CITY_MATERIAL_TOKENS = [
  '--city-paper',
  '--city-paper',
  '--city-paper',
  '--city-paper',
  '--city-roof',
  '--city-lawn',
  '--city-lawn-deep',
  '--city-trunk',
  '--paint-red',
  '--paint-coral',
  '--paint-yellow',
  '--paint-violet',
  '--paint-blue',
  '--city-ground',
] as const;

/** Window strokes, ink outlines and the build wireframe. */
export const CITY_LINE_TOKENS = ['--city-graphite', '--city-ink', '--city-wire'] as const;

export type Rgb = readonly [number, number, number];

/** Parses `#rgb` / `#rrggbb` into 0-1 channels; anything else is undefined. */
export function parseHexColor(value: string): Rgb | undefined {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())?.[1];
  if (!hex) return undefined;
  const full = hex.length === 3 ? hex.replace(/./g, '$&$&') : hex;
  const n = Number.parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Resolves every token to a colour, or undefined if any is missing or not a hex colour. */
export function readColors(
  tokens: readonly string[],
  read: (token: string) => string,
): Rgb[] | undefined {
  const colors = tokens.map((token) => parseHexColor(read(token)));
  return colors.every((c): c is Rgb => c !== undefined) ? colors : undefined;
}
