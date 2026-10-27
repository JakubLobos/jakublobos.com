export const QUALITY_RULES = [
  'no_words',
  'shouting',
  'character_run',
  'symbol_flood',
  'keyboard_mash',
  'repetition',
  'unbroken_token',
] as const;
export type QualityRule = (typeof QUALITY_RULES)[number];

export type QualityResult =
  { readonly ok: true } | { readonly ok: false; readonly rule: QualityRule };

const MIN_LETTERS = 2;
const SHOUT_MIN_LETTERS = 8;
const SHOUT_UPPERCASE_PERCENT = 70;
const MAX_CHARACTER_RUN = 5;
const SYMBOL_FLOOD_PERCENT = 40;
const MASH_CONSONANTS = 7;
const MAX_WORD_REPEATS = 3;
const MAX_TOKEN_LENGTH = 30;

const LETTER = /\p{L}/gu;
const UPPERCASE = /\p{Lu}/gu;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
// Modifiers (variation selector, ZWJ, combining marks) belong to the character before them, so
// "❤️" counts once, like "😀", and Indic vowel signs do not look like symbols.
const MODIFIER = /[\p{M}\p{Cf}]/gu;
const SAME_CHARACTER_RUN = new RegExp(`(.)\\1{${MAX_CHARACTER_RUN},}`, 'su');
// "y" counts as a vowel (Polish "bezwzględny", English "rhythm"); the run only spans letters.
const CONSONANT_MASH = new RegExp(`[bcdfghjklmnpqrstvwxz]{${MASH_CONSONANTS},}`, 'u');
const WORD = /[\p{L}\p{N}]+/gu;

const codePointLength = (text: string): number => Array.from(text).length;

const count = (text: string, pattern: RegExp): number => text.match(pattern)?.length ?? 0;

/** Lowercase, strip diacritics, and map the one Polish letter NFKD cannot decompose. */
function foldLatin(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replaceAll('ł', 'l');
}

function hasRepeatedWord(text: string): boolean {
  const seen = new Map<string, number>();
  for (const word of text.toLowerCase().match(WORD) ?? []) {
    // Single characters ("a", Polish "w", "i", "z") legitimately recur.
    if (codePointLength(word) < 2) continue;
    const next = (seen.get(word) ?? 0) + 1;
    if (next > MAX_WORD_REPEATS) return true;
    seen.set(word, next);
  }
  return false;
}

function isSymbolFlood(text: string): boolean {
  const characters = Array.from(text.replace(/\s+/gu, '').replace(MODIFIER, ''));
  if (characters.length === 0) return false;
  const symbols = characters.filter((character) => !LETTER_OR_DIGIT.test(character)).length;
  return symbols * 100 > characters.length * SYMBOL_FLOOD_PERCENT;
}

/**
 * Silent "weird text" heuristics (docs/guestbook-moderation.md §7.1). Expects text already
 * normalized by `checkGuestbookBody`. Returns the first rule that fires.
 */
export function checkQuality(text: string): QualityResult {
  const letters = count(text, LETTER);
  if (letters < MIN_LETTERS) return { ok: false, rule: 'no_words' };
  if (
    letters >= SHOUT_MIN_LETTERS &&
    count(text, UPPERCASE) * 100 > letters * SHOUT_UPPERCASE_PERCENT
  ) {
    return { ok: false, rule: 'shouting' };
  }
  if (SAME_CHARACTER_RUN.test(text)) return { ok: false, rule: 'character_run' };
  if (isSymbolFlood(text)) return { ok: false, rule: 'symbol_flood' };
  if (CONSONANT_MASH.test(foldLatin(text))) return { ok: false, rule: 'keyboard_mash' };
  if (hasRepeatedWord(text)) return { ok: false, rule: 'repetition' };
  if (text.split(/\s+/u).some((token) => codePointLength(token) > MAX_TOKEN_LENGTH)) {
    return { ok: false, rule: 'unbroken_token' };
  }
  return { ok: true };
}
