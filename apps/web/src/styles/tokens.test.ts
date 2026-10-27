import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

function parseTokens(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of source.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = m;
    if (name && value) map.set(name, value.trim().replace(/\s+/g, ' '));
  }
  return map;
}

const tokens = parseTokens(css);

const expected: Record<string, string> = {
  '--color-bg': '#f7f7f6',
  '--color-surface': '#fbfbfa',
  '--color-ink': '#2b2b2b',
  '--color-text-body': '#3d3d3b',
  '--color-text-secondary': '#5c5c5a',
  '--color-text-muted': '#717170',
  '--color-text-faint': '#a9a9a6',
  '--color-line': '#e4e4e1',
  '--color-line-strong': '#d6d6d3',
  '--color-grid': '#ececea',
  '--color-hover': '#e4e4e0',
  '--color-primary': '#2a64e0',
  '--color-primary-hover': '#3570ea',
  '--color-primary-edge': '#1a3f94',
  '--color-on-primary': '#ffffff',
  '--color-highlight': '#fdf25c',
  '--color-on-highlight': '#1f1f1e',
  '--color-danger': '#c23b4c',
  '--color-tech': '#1778ae',
  '--color-tag': '#1877b4',
  '--color-marker': '#f9c9c9',
  '--color-focus': '#2a64e0',
  '--color-overlay': 'rgb(43 43 43 / 0.28)',
  '--color-cookie': '#e8b778',
  '--color-cookie-chip': '#5a3a22',
  '--paint-red': '#e05a6a',
  '--paint-red-tint': 'rgb(224 90 106 / 0.35)',
  '--paint-coral': '#ff7a5c',
  '--paint-coral-tint': 'rgb(255 122 92 / 0.4)',
  '--paint-yellow': '#fdf25c',
  '--paint-yellow-tint': 'rgb(253 242 92 / 0.85)',
  '--paint-purple': '#a334d0',
  '--paint-purple-tint': 'rgb(163 52 208 / 0.3)',
  '--paint-violet': '#7b5cff',
  '--paint-violet-tint': 'rgb(123 92 255 / 0.32)',
  '--paint-blue': '#2e88d0',
  '--paint-blue-tint': 'rgb(46 136 208 / 0.32)',
  '--paint-red-text': '#bd4c5a',
  '--paint-violet-text': '#7456f0',
  '--paint-blue-text': '#2876b5',
  '--text-display': 'clamp(2.5rem, 6vw, 4.25rem)',
  '--text-h2': 'clamp(2.125rem, 4vw, 2.875rem)',
  '--text-body': '0.9375rem',
  '--text-label': '0.75rem',
  '--leading-cookie': '1.65',
  '--leading-status': '1.6',
  '--weight-semibold': '600',
  '--tracking-label': '0.06em',
  '--space-2': '2px',
  '--space-80': '80px',
  '--space-section-block': 'clamp(64px, 10vw, 96px)',
  '--content-max': '1000px',
  '--scroll-offset': '88px',
  '--grid-cell-w': '235px',
  '--grid-cell-h': '106px',
  '--z-cookie': '8',
  '--z-skip': '10',
  '--radius-sketch': '255px 15px 225px 15px / 15px 225px 15px 255px',
  '--shadow-dialog': '0 10px 0 var(--color-ink)',
  '--focus-ring': '2px solid var(--color-focus)',
  '--duration-press': '120ms',
  '--duration-hover': '150ms',
  '--duration-state': '200ms',
  '--duration-page': '250ms',
  '--duration-tint': '300ms',
  '--duration-panel': '350ms',
  '--duration-type': '240ms',
  '--duration-blink': '180ms',
  '--duration-spin': '700ms',
  '--duration-marquee': '45s',
  '--ease-standard': 'ease',
  '--ease-spring': 'cubic-bezier(0.3, 1.6, 0.5, 1)',
  '--ease-type': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
};

describe('tokens.css', () => {
  it.each(Object.entries(expected))('%s = %s', (name, value) => {
    expect(tokens.get(name)).toBe(value);
  });

  it('keeps all six paints and tints in the documented order', () => {
    const order = [...tokens.keys()].filter((k) => /^--paint-[a-z]+$/.test(k));
    expect(order).toEqual(
      ['red', 'coral', 'yellow', 'purple', 'violet', 'blue'].map((p) => `--paint-${p}`),
    );
    for (const p of order) expect(tokens.has(`${p}-tint`)).toBe(true);
  });

  it('declares only inside :root and leaves font families to the Fonts API', () => {
    const selectors = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .match(/[^{}]+(?=\{)/g)
      ?.map((s) => s.trim());
    expect(selectors).toEqual([':root']);
    expect([...tokens.keys()].filter((k) => k.startsWith('--font-'))).toEqual([]);
  });
});
