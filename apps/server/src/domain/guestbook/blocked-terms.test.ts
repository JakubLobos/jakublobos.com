import { describe, expect, it } from 'vitest';
import { BLOCKED_TERM_GROUPS, findBlockedTerm } from './blocked-terms.ts';

describe('findBlockedTerm', () => {
  it.each([
    ['plain', 'what a shit site', 'shit'],
    ['case', 'KuRwA mac', 'kurwa'],
    ['diacritics', 'to jest GÓWNO', 'gowno'],
    ['diacritics folded from decomposed text', 'jebać to', 'jebac'],
    ['stretched letters', 'fuuuuuck this', 'fuck'],
    ['stretched doubled letters', 'what an assssshole', 'asshole'],
    ['leetspeak digits', 'sh1t and f4ck', 'shit'],
    ['leetspeak symbols', 'you $hit', 'shit'],
    ['combining strike-through (fuck)', 'f\u0336u\u0336c\u0336k\u0336 you', 'fuck'],
    ['combining strike-through (kurwa)', 'k\u0336u\u0336r\u0336w\u0336a\u0336 strona', 'kurwa'],
    ['soft hyphen inside the word', 'f\u00ADuck', 'fuck'],
    ['zero-width space inside the word', 'sh\u200Bit', 'shit'],
    ['punctuation around the word', '(casino!)', 'casino'],
    ['spam keyword', 'buy crypto now', 'crypto'],
  ])('catches %s', (_label, text, term) => {
    expect(findBlockedTerm(text)).toBe(term);
  });

  it('matches whole words only (Scunthorpe cases per language)', () => {
    expect(findBlockedTerm('Greetings from Scunthorpe')).toBeNull();
    expect(findBlockedTerm('a classic assistant')).toBeNull();
    expect(findBlockedTerm('Pan Dupała to dobry człowiek')).toBeNull();
  });

  it('keeps doubled letters in a term from matching the single-letter word', () => {
    expect(findBlockedTerm('as always')).toBeNull();
    expect(findBlockedTerm('ass')).toBe('ass');
  });

  it('does not leet-decode numbers', () => {
    expect(findBlockedTerm('waited 455 days')).toBeNull();
    expect(findBlockedTerm('what a @$$')).toBe('ass');
  });

  it('lets clean text through', () => {
    expect(findBlockedTerm('Great portfolio, love the colours!')).toBeNull();
    expect(findBlockedTerm('')).toBeNull();
  });

  it('keeps every list entry plain lowercase ASCII, so it can match after folding', () => {
    for (const terms of Object.values(BLOCKED_TERM_GROUPS)) {
      for (const term of terms) expect(term).toMatch(/^[a-z]+$/);
    }
  });
});
