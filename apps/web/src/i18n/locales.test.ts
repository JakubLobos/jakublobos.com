import { describe, expect, it } from 'vitest';
import { alternatePath, isLocale, localeFromAstro } from './locales.ts';

describe('alternatePath', () => {
  it.each([
    ['en', '/', '/'],
    ['pl', '/', '/pl'],
    ['en', '/privacy', '/privacy'],
    ['pl', '/privacy', '/pl/privacy'],
    ['pl', '/404', '/pl/404'],
  ] as const)('%s %s -> %s', (locale, path, expected) => {
    expect(alternatePath(locale, path)).toBe(expected);
  });
});

describe('localeFromAstro', () => {
  it('uses the matched route locale', () => {
    expect(localeFromAstro({ currentLocale: 'pl' })).toBe('pl');
  });

  it('falls back to the default locale for missing or unknown values', () => {
    expect(localeFromAstro({ currentLocale: undefined })).toBe('en');
    expect(localeFromAstro({ currentLocale: 'de' })).toBe('en');
  });
});

describe('isLocale', () => {
  it('narrows only supported locales', () => {
    expect(isLocale('pl')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
