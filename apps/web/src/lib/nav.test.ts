import { describe, expect, it } from 'vitest';
import { currentSection, navHref } from './nav.ts';

describe('currentSection', () => {
  const at = (...tops: (number | null)[]) =>
    (['a', 'b', 'c'] as const).map((id, i) => ({ id, top: tops[i] ?? null }));

  it('is null before the first section reaches 40 % of the viewport', () => {
    expect(currentSection(at(400, 900, 1400), 1000)).toBeNull();
  });

  it('picks the last section whose top is above 40 % of the viewport height', () => {
    expect(currentSection(at(-900, 399, 800), 1000)).toBe('b');
    expect(currentSection(at(-900, -300, 399), 1000)).toBe('c');
  });

  it('requires the top to be strictly above the threshold', () => {
    expect(currentSection(at(-100, 400, 900), 1000)).toBe('a');
  });

  it('skips sections missing from the page', () => {
    expect(currentSection(at(-500, null, null), 1000)).toBe('a');
    expect(currentSection(at(null, null, null), 1000)).toBeNull();
  });
});

describe('navHref', () => {
  it('stays in-page on the home page', () => {
    expect(navHref('en', '/', 'projects')).toBe('#projects');
    expect(navHref('pl', '/', 'projects')).toBe('#projects');
    expect(navHref('pl', '/')).toBe('#top');
  });

  it('points to the localized home page from other pages', () => {
    expect(navHref('en', '/privacy', 'contact')).toBe('/#contact');
    expect(navHref('pl', '/privacy', 'contact')).toBe('/pl#contact');
    expect(navHref('en', '/privacy')).toBe('/');
    expect(navHref('pl', '/404')).toBe('/pl');
  });
});
