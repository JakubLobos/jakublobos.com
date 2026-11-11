import { describe, expect, it } from 'vitest';
import { parseHexColor, readColors } from './palette.ts';

describe('parseHexColor', () => {
  it('reads short and long hex colours as 0-1 channels', () => {
    expect(parseHexColor(' #fff ')).toEqual([1, 1, 1]);
    expect(parseHexColor('#336699')).toEqual([0.2, 0.4, 0.6]);
  });

  it('rejects anything that is not a hex colour', () => {
    expect(parseHexColor('')).toBeUndefined();
    expect(parseHexColor('rgb(0 0 0)')).toBeUndefined();
    expect(parseHexColor('#12345')).toBeUndefined();
  });
});

describe('readColors', () => {
  it('fails as a whole when one token is missing', () => {
    const tokens: Record<string, string> = { '--a': '#000000', '--b': '' };
    expect(readColors(['--a'], (t) => tokens[t] ?? '')).toEqual([[0, 0, 0]]);
    expect(readColors(['--a', '--b'], (t) => tokens[t] ?? '')).toBeUndefined();
  });
});
