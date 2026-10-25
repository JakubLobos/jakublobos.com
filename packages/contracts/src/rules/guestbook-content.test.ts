import { describe, expect, it } from 'vitest';
import {
  checkGuestbookBody,
  containsContactInfo,
  containsForbiddenCharacters,
  containsLink,
  LINK_TLDS,
  normalizeGuestbookBody,
  validateGuestbookBody,
} from './guestbook-content.ts';

const cp = (...codes: number[]): string => String.fromCodePoint(...codes);

describe('normalizeGuestbookBody', () => {
  it.each([
    ['  hello  ', 'hello'],
    ['a   b\t\tc\n\nd', 'a b c d'],
    [`  x ${cp(0x3000)} y `, 'x y'],
  ])('collapses whitespace: %j', (raw, expected) => {
    expect(normalizeGuestbookBody(raw)).toBe(expected);
  });

  it('normalizes decomposed characters to NFC', () => {
    // U+0142 (l with stroke) has no canonical decomposition, so it must survive unchanged.
    expect(normalizeGuestbookBody(cp(0x142))).toBe(cp(0x142));
    expect(normalizeGuestbookBody(`e${cp(0x301)}`)).toBe(cp(0xe9));
    expect(normalizeGuestbookBody(`a${cp(0x328)}`)).toBe(cp(0x105));
  });
});

describe('validateGuestbookBody length', () => {
  const pair = cp(0x1f600); // 2 UTF-16 units
  it.each([
    ['', ['empty']],
    ['a', []],
    ['a'.repeat(120), []],
    ['a'.repeat(121), ['too_long']],
    ['a'.repeat(118) + pair, []],
    ['a'.repeat(119) + pair, ['too_long']],
  ])('length case %#', (text, expected) => {
    expect(validateGuestbookBody(text)).toEqual(expected);
  });

  it('returns all applicable codes in priority order', () => {
    const text = `${'a'.repeat(120)}\u0000 www.x.com a@b.co`;
    expect(validateGuestbookBody(text)).toEqual([
      'too_long',
      'invalid_characters',
      'links_not_allowed',
      'contact_info_not_allowed',
    ]);
  });
});

describe('forbidden characters', () => {
  const forbidden = [
    0x0000, 0x0009, 0x000a, 0x001f, 0x007f, 0x0085, 0x009f, 0x202a, 0x202c, 0x202e, 0x2066, 0x2069,
    0x200b, 0x2060, 0xfeff,
  ];
  it.each(forbidden)('rejects code point %i', (code) => {
    expect(containsForbiddenCharacters(`a${cp(code)}b`)).toBe(true);
    expect(validateGuestbookBody(`a${cp(code)}b`)).toContain('invalid_characters');
  });

  it.each([0x0020, 0x007e, 0x00a0, 0x00a1, 0x2029, 0x202f, 0x2065, 0x206a, 0x200c, 0x200d])(
    'accepts code point %i',
    (code) => {
      expect(containsForbiddenCharacters(`a${cp(code)}b`)).toBe(false);
    },
  );

  it('allows a ZWJ emoji sequence', () => {
    const family = cp(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467);
    expect(validateGuestbookBody(family)).toEqual([]);
  });

  it('honours an allow set', () => {
    expect(containsForbiddenCharacters('a\nb', new Set([0x0a]))).toBe(false);
    expect(containsForbiddenCharacters('a\rb', new Set([0x0a]))).toBe(true);
  });
});

describe('containsLink', () => {
  it.each([
    'https://example.com',
    'HTTP://x',
    'see www.foo',
    'example.com',
    'visit zażółć.pl now',
    'пример.ru',
    'ąę.pl',
    'żółć.pl',
    'example.pl',
    'try socket.io.com',
    'my-site.io',
    'a.dev',
    'foo.xyz',
    'bit.ly/x',
    'x.gg',
  ])('detects %j', (text) => {
    expect(containsLink(text)).toBe(true);
  });

  it.each([
    'Next.js',
    'Node.js',
    'ASP.NET',
    'Socket.io',
    'socket.io',
    'job.Me',
    'Example.COM',
    'to.coś',
    'Super.Coś',
    'e.g. this',
    'i.e. that',
    'v1.2',
    '3.14',
    'Hello, world.',
    'a.b',
  ])('ignores %j', (text) => {
    expect(containsLink(text)).toBe(false);
  });

  it('matches every curated TLD', () => {
    for (const tld of LINK_TLDS) expect(containsLink(`site.${tld}`)).toBe(true);
  });
});

describe('containsContactInfo', () => {
  it.each([
    'jane@company.com',
    'mail me a@b.co',
    '+48 000 000 000',
    '123456789',
    '123-456-789',
    '123.456.789',
    '+48000000000',
  ])('detects %j', (text) => {
    expect(containsContactInfo(text)).toBe(true);
  });

  it.each(['2023 2024', 'in 2024', 'a@b', '@handle', '12345678', 'hello'])('ignores %j', (text) => {
    expect(containsContactInfo(text)).toBe(false);
  });
});

describe('checkGuestbookBody (normalize -> validate pipeline)', () => {
  it.each([
    ['', ['empty']],
    [' \t\n ', ['empty']],
    ['  hello   world ', []],
    ['a\nb', []],
    [`${cp(0xfeff)}hello`, ['invalid_characters']],
    [`hello${cp(0xfeff)}`, ['invalid_characters']],
    [`he${cp(0xfeff)}llo`, ['invalid_characters']],
    [`a${cp(0x0)}b`, ['invalid_characters']],
    [`a${cp(0xd800)}b`, ['invalid_characters']],
    [`ok ${cp(0xdc00)}`, ['invalid_characters']],
    ['see www.x.com', ['links_not_allowed']],
  ])('case %#', (raw, expected) => {
    expect(checkGuestbookBody(raw).errors).toEqual(expected);
  });

  it('returns the normalized text', () => {
    expect(checkGuestbookBody(`  e${cp(0x301)}  x `).normalized).toBe(`${cp(0xe9)} x`);
  });

  it('exposes a lone surrogate to the direct helpers', () => {
    expect(containsForbiddenCharacters(cp(0xd800))).toBe(true);
    expect(validateGuestbookBody(cp(0xd800))).toEqual(['invalid_characters']);
  });

  it('keeps the pre-normalization half honest: a lone BOM normalizes to empty but is reported', () => {
    expect(normalizeGuestbookBody(cp(0xfeff))).toBe('');
    expect(checkGuestbookBody(cp(0xfeff)).errors).toEqual(['empty', 'invalid_characters']);
  });
});
