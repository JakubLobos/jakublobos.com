import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

// axe cannot resolve backgrounds over the page's grid pattern and reports every text node as
// "incomplete" for color-contrast, so a clean axe run says nothing about contrast. This checks
// the token pairs the design actually uses, straight from tokens.css.
const tokens = new Map<string, string>();
for (const [, name, value] of readFileSync(
  new URL('../apps/web/src/styles/tokens.css', import.meta.url),
  'utf8',
).matchAll(/(--color-[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
  if (name !== undefined && value !== undefined) tokens.set(name, value);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

function contrast(foreground: string, background: string): number {
  const [hi, lo] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

function ratio(foreground: string, background: string): number {
  const fg = tokens.get(foreground);
  const bg = tokens.get(background);
  if (fg === undefined || bg === undefined) {
    throw new Error(`token missing from tokens.css: ${foreground} or ${background}`);
  }
  return contrast(fg, bg);
}

// [foreground, background, minimum]: 4.5 for body and small text, 3 for large text and UI.
const PAIRS: readonly (readonly [string, string, number])[] = [
  ...['--color-bg', '--color-surface'].flatMap((surface) =>
    [
      '--color-ink',
      '--color-text-body',
      '--color-text-secondary',
      '--color-text-muted',
      '--color-primary',
      '--color-tech',
      '--color-tag',
      '--color-danger',
    ].map((text) => [text, surface, 4.5] as const),
  ),
  ['--color-on-primary', '--color-primary', 4.5],
  ['--color-on-highlight', '--color-highlight', 4.5],
  ['--color-focus', '--color-bg', 3],
];

test('@contrast token text and UI pairs meet WCAG AA', ({ browserName }, testInfo) => {
  // Pure computation, no browser: one project is enough.
  test.skip(testInfo.project.name !== 'chromium-desktop', `${browserName} project: runs once`);

  const failing = PAIRS.map(([foreground, background, minimum]) => ({
    pair: `${foreground} on ${background}`,
    minimum,
    actual: Number(ratio(foreground, background).toFixed(2)),
  })).filter(({ actual, minimum }) => actual < minimum);
  expect(failing).toEqual([]);
});
