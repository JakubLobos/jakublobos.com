/**
 * Text model behind the typing-field mirror. The mirror holds one node per grapheme ("unit"), so
 * every edit is expressed as a splice on a unit list; nodes outside the splice are never touched.
 */

export interface UnitDiff {
  /** Index of the first changed unit. */
  start: number;
  /** Units removed from the previous list at `start`. */
  removed: number;
  /** Units inserted into the new list at `start`. */
  inserted: number;
}

export interface Run {
  /** `true` for a run of non-whitespace units (a "word"), `false` for whitespace. */
  word: boolean;
  /** Unit range `[from, to)`. */
  from: number;
  to: number;
}

const WHITESPACE = /^\s+$/u;

export function isWhitespaceUnit(unit: string): boolean {
  return WHITESPACE.test(unit);
}

// Graphemes, not code points: a base letter plus a combining accent must stay in one glyph box.
const segmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export function splitGraphemes(text: string): string[] {
  if (!segmenter) return Array.from(text);
  return Array.from(segmenter.segment(text), (part) => part.segment);
}

/** Converts a UTF-16 offset (e.g. `selectionStart`) into an index into `units`. */
export function unitIndexAt(units: readonly string[], offset: number): number {
  let consumed = 0;
  for (let i = 0; i < units.length; i += 1) {
    if (consumed >= offset) return i;
    consumed += units[i]?.length ?? 0;
  }
  return units.length;
}

/**
 * Smallest splice turning `prev` into `next`: common prefix and suffix are kept.
 *
 * `caretEnd` (unit index after the edit) disambiguates repeated characters: typing "a" at the start
 * of "aa" marks the first unit as new, not the last, when the caret says the edit ended at 1.
 */
export function diffUnits(
  prev: readonly string[],
  next: readonly string[],
  caretEnd?: number,
): UnitDiff {
  const shared = Math.min(prev.length, next.length);

  let suffix = 0;
  if (caretEnd !== undefined && caretEnd >= 0 && caretEnd <= next.length) {
    const tail = next.length - caretEnd;
    if (tail <= prev.length && tail <= shared && endsWith(prev, next, tail)) suffix = tail;
  }

  let prefix = 0;
  while (prefix < shared - suffix && prev[prefix] === next[prefix]) prefix += 1;

  if (suffix === 0) {
    while (
      suffix < shared - prefix &&
      prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]
    ) {
      suffix += 1;
    }
  }

  return {
    start: prefix,
    removed: prev.length - prefix - suffix,
    inserted: next.length - prefix - suffix,
  };
}

function endsWith(prev: readonly string[], next: readonly string[], count: number): boolean {
  for (let i = 1; i <= count; i += 1) {
    if (prev[prev.length - i] !== next[next.length - i]) return false;
  }
  return true;
}

const ALNUM = /^[\p{L}\p{N}]/u;
const EM_DASH = String.fromCodePoint(0x2014);
const HYPHEN = String.fromCodePoint(0x2010);

/**
 * Whether a browser may wrap between `units[i - 1]` and `units[i]` inside one unspaced token. These
 * are the opportunities Chrome takes (checked against a plain textarea): after a hyphen between
 * letters or digits, after a "?" before one, and on both sides of an em dash. A textarea wraps
 * there, so the mirror has to as well; slashes, dots and "&" are not break points.
 */
function breaksBefore(units: readonly string[], i: number): boolean {
  const prev = units[i - 1];
  const cur = units[i];
  if (prev === undefined || cur === undefined) return false;
  if (isWhitespaceUnit(prev) || isWhitespaceUnit(cur)) return false;
  if (cur === EM_DASH || prev === EM_DASH) return true;
  if (prev === '?') return ALNUM.test(cur);
  if (prev === '-' || prev === HYPHEN) {
    const before = units[i - 2];
    return before !== undefined && ALNUM.test(before) && ALNUM.test(cur);
  }
  return false;
}

/**
 * Splits units into whitespace runs and unbreakable word runs. A long token can yield several
 * adjacent word runs where the browser could wrap between them.
 */
export function splitRuns(units: readonly string[]): Run[] {
  const runs: Run[] = [];
  for (let i = 0; i < units.length; i += 1) {
    const word = !isWhitespaceUnit(units[i] ?? '');
    const last = runs[runs.length - 1];
    if (last?.word === word && !(word && breaksBefore(units, i))) last.to = i + 1;
    else runs.push({ word, from: i, to: i + 1 });
  }
  return runs;
}
