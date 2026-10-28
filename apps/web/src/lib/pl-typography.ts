const NBSP = '\u00A0';

// Single-letter Polish words (conjunctions and prepositions) must not end a line.
const SINGLE_LETTER = /(?<![\p{L}\p{N}])([aiouwzAIOUWZ]) (?=\S)/gu;

// A number stays on the same line as its unit, which is spelled out in a handful of forms.
const NUMBER_UNIT =
  /(\d) (?=(?:znak|godzin|wpis|minut|sekund|dni)\p{L}*|(?:rok|lat|lata)(?!\p{L}))/gu;

// Abbreviations that introduce a number or a letter ("min. 10", "art. 6", "lit. a").
const ABBREVIATION = /(?<!\p{L})(art|ust|lit|min|maks|nr)\. (?=\S)/gu;

// A spaced dash (hyphen, en or em dash) must not start a line, so the space before it is
// non-breaking.
const SPACED_DASH = / (?=[-–—] )/gu;

/**
 * Applies Polish typographic conventions to a string: non-breaking spaces after single-letter
 * words, between a number and its unit, and after the abbreviations "art.", "ust.", "lit.",
 * "min.", "maks." and "nr", and before a spaced dash. Idempotent and safe to run on
 * strings with `{placeholders}`.
 */
export function polishTypography(text: string): string {
  return (
    text
      .replace(ABBREVIATION, `$1.${NBSP}`)
      .replace(NUMBER_UNIT, `$1${NBSP}`)
      .replace(SPACED_DASH, NBSP)
      // Last, so that "lit. a zgoda" binds the letter too (the abbreviation rule adds a NBSP
      // before it, which the single-letter lookbehind does not mind).
      .replace(SINGLE_LETTER, `$1${NBSP}`)
  );
}

type Deep = unknown;

/**
 * Applies `polishTypography` to every string in a tree of objects, arrays and message functions
 * (a function's return value is transformed). Keys in `skipKeys` are copied untouched, for ids
 * and URLs that must never contain a non-breaking space.
 */
export function polishDeep<T>(value: T, skipKeys: ReadonlySet<string> = new Set()): T {
  return walk(value, skipKeys) as T;
}

function walk(value: Deep, skipKeys: ReadonlySet<string>): Deep {
  if (typeof value === 'string') return polishTypography(value);
  if (typeof value === 'function') {
    const fn = value as (...args: never[]) => Deep;
    return (...args: never[]) => walk(fn(...args), skipKeys);
  }
  if (Array.isArray(value)) return value.map((item: Deep) => walk(item, skipKeys));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        skipKeys.has(key) ? item : walk(item, skipKeys),
      ]),
    );
  }
  return value;
}
