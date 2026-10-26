import { describe, expect, it } from 'vitest';
import { resolveSetLanguage } from './set-language.ts';

const resolve = (query: string) =>
  resolveSetLanguage(new URL(`https://jakublobos.com/set-language?${query}`));

describe('resolveSetLanguage', () => {
  it('sets a one-year, locked-down lang cookie', () => {
    expect(resolve('lang=pl&to=/pl')).toEqual({
      cookie: 'lang=pl; Max-Age=31536000; Path=/; SameSite=Lax; Secure; HttpOnly',
      location: '/pl',
    });
  });

  it.each(['/', '/pl', '/privacy', '/pl/privacy'])('allows %s', (to) => {
    expect(resolve(`lang=en&to=${encodeURIComponent(to)}`)).toMatchObject({ location: to });
  });

  it.each([
    'https://evil.example',
    '//evil',
    '/\\evil',
    '%2F%2Fevil',
    '/%5Cevil',
    '/unknown',
    '/pl/',
    '/privacy?x=1',
    'javascript:alert(1)',
    '',
  ])('sends to=%j to the locale home, never off-site', (to) => {
    expect(resolve(`lang=pl&to=${to}`)).toMatchObject({ location: '/pl' });
    expect(resolve(`lang=en&to=${to}`)).toMatchObject({ location: '/' });
  });

  it('uses the locale home when `to` is absent', () => {
    expect(resolve('lang=pl')).toMatchObject({ location: '/pl' });
  });

  it.each(['', 'lang=de', 'lang=PL', 'lang='])('rejects an invalid lang (%j)', (query) => {
    expect(resolve(query)).toEqual({ error: 400 });
  });
});
