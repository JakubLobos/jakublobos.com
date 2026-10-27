// D-06: owner review. Curated EN + PL list, written in plain lowercase ASCII (the matcher folds
// diacritics, leetspeak and repeated letters on the input side). Deliberately small and
// whole-word only: a bigger list means more false positives, and the suitability reviewer
// catches the rest.
const PROFANITY_EN = [
  'fuck',
  'fucks',
  'fucked',
  'fucker',
  'fuckers',
  'fucking',
  'motherfucker',
  'shit',
  'shits',
  'shitty',
  'bullshit',
  'bitch',
  'bitches',
  'asshole',
  'ass',
  'dick',
  'cock',
  'cunt',
  'pussy',
  'bastard',
  'slut',
  'whore',
  'wanker',
  'twat',
] as const;

const SLURS_EN = ['faggot', 'fag', 'nigger', 'nigga', 'retard', 'retarded', 'tranny'] as const;

const PROFANITY_PL = [
  'kurwa',
  'kurwy',
  'kurwo',
  'kurwiu',
  'skurwysyn',
  'skurwiel',
  'chuj',
  'chuja',
  'chujem',
  'chujowy',
  'huj',
  'pierdol',
  'pierdole',
  'pierdolic',
  'pierdolony',
  'pierdolenie',
  'jebac',
  'jebany',
  'jebana',
  'jebane',
  'jebie',
  'pojeb',
  'pojebany',
  'zjeb',
  'spierdalaj',
  'wypierdalaj',
  'dupa',
  'dupek',
  'cipa',
  'pizda',
  'kutas',
  'fiut',
  'gowno',
  'szmata',
  'dziwka',
  'debil',
  'idiota',
  'ruchac',
] as const;

const SLURS_PL = ['czarnuch', 'ciota', 'cwel'] as const;

const SPAM_KEYWORDS = [
  'crypto',
  'bitcoin',
  'casino',
  'kasyno',
  'viagra',
  'forex',
  'porn',
  'porno',
  'xxx',
] as const;

// Unambiguous meme tokens only: "67" and "sigma" are real numbers and words. A pure number is
// not leet-decoded, so "6767" stays a digit-only term.
const MEME_TERMS = ['skibidi', '6767'] as const;

export const BLOCKED_TERM_GROUPS = {
  profanityEn: PROFANITY_EN,
  slursEn: SLURS_EN,
  profanityPl: PROFANITY_PL,
  slursPl: SLURS_PL,
  spam: SPAM_KEYWORDS,
  meme: MEME_TERMS,
} as const;

const LEET: Readonly<Record<string, string>> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

const LEET_SYMBOLS = /[013457@$]/gu;

// Leet symbols are token characters so "$hit" and "f@ck" stay one word.
const TOKEN = /[\p{L}\p{N}@$]+/gu;

// Applied to the whole text before tokenizing: combining marks (strike-through, zalgo) and
// invisible format characters (soft hyphen, zero-width) would otherwise split a word in two.
function foldText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\p{M}\p{Cf}]/gu, '')
    .toLowerCase()
    .replaceAll('ł', 'l');
}

function decodeLeet(token: string): string {
  // A pure number ("455", "2024") is a number, not disguised text; "@$$" still decodes.
  if (/^\p{N}+$/u.test(token)) return token;
  return token.replace(LEET_SYMBOLS, (symbol) => LEET[symbol] ?? symbol);
}

/**
 * One whole-word pattern per term where each letter accepts stretching ("fuuuck"), but a
 * doubled letter in the term must stay doubled ("ass" never matches "as").
 */
function compileTerm(term: string): RegExp {
  const parts = term.match(/(.)\1*/gu) ?? [];
  const body = parts.map((run) => `${run[0] ?? ''}{${run.length},}`).join('');
  return new RegExp(`^${body}$`, 'u');
}

const MATCHERS: readonly { readonly term: string; readonly pattern: RegExp }[] = Object.values(
  BLOCKED_TERM_GROUPS,
).flatMap((group) => group.map((term) => ({ term, pattern: compileTerm(term) })));

export function isMemeTerm(term: string): boolean {
  return BLOCKED_TERM_GROUPS.meme.some((meme) => meme === term);
}

/** The list entry that matched as a whole word, or `null`. Never log the input text. */
export function findBlockedTerm(text: string): string | null {
  for (const token of foldText(text).match(TOKEN) ?? []) {
    const normalized = decodeLeet(token);
    const hit = MATCHERS.find((matcher) => matcher.pattern.test(normalized));
    if (hit !== undefined) return hit.term;
  }
  return null;
}
