/**
 * Milliseconds from a CSS `<time>` such as `350ms` or `.35s`, or `null` when it is not one.
 * Custom properties keep their source text, and the production minifier rewrites `350ms` to `.35s`.
 */
export function parseCssTime(raw: string): number | null {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(raw.trim());
  if (!match) return null;
  const value = Number(match[1]);
  return match[2] === 's' ? value * 1000 : value;
}
