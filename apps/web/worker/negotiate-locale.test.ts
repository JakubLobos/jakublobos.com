import { describe, expect, it } from 'vitest';
import { negotiateLocale, readCookie } from './negotiate-locale.ts';

const negotiate = (acceptLanguage: string | null, cookieLang: string | null = null) =>
  negotiateLocale({ acceptLanguage, cookieLang });

describe('negotiateLocale', () => {
  it.each([
    [null, 'en'],
    ['', 'en'],
    ['de,fr;q=0.8', 'en'],
    ['pl;q=0.5,en;q=0.5', 'pl'], // tie: header order
    ['en;q=0.5,pl;q=0.5', 'en'],
    ['pl;q=0,en;q=0.1', 'en'], // q=0 is "not acceptable"
    ['PL-pl', 'pl'],
    ['pl;q=abc,en;q=0.2', 'en'], // malformed q is ignored
    ['*', 'en'],
  ])('Accept-Language %j -> %s', (header, expected) => {
    expect(negotiate(header)).toBe(expected);
  });

  it('ignores an invalid lang cookie', () => {
    expect(negotiate('pl', 'de')).toBe('pl');
    expect(negotiate(null, '')).toBe('en');
  });
});

describe('readCookie', () => {
  it('finds a cookie among several and tolerates absence', () => {
    expect(readCookie('a=1; lang=pl; b=2', 'lang')).toBe('pl');
    expect(readCookie('xlang=pl', 'lang')).toBeNull();
    expect(readCookie(null, 'lang')).toBeNull();
  });
});
