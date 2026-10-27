import { describe, expect, it } from 'vitest';
import { parseCssTime } from './css-time.ts';

describe('parseCssTime', () => {
  it.each([
    ['350ms', 350],
    ['.35s', 350],
    ['0.35s', 350],
    ['1s', 1000],
    ['  180ms  ', 180],
  ])('reads %j as %d ms', (raw, ms) => {
    expect(parseCssTime(raw)).toBeCloseTo(ms);
  });

  it.each(['', '350', 'fast', '-1s', '-200ms'])('rejects %j', (raw) => {
    expect(parseCssTime(raw)).toBeNull();
  });
});
