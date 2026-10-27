import { describe, expect, it } from 'vitest';
import { breakpoints, matches } from './breakpoints.ts';

describe('breakpoints', () => {
  it('evaluates the named query through matchMedia', () => {
    const seen: string[] = [];
    const matchMedia = (query: string) => {
      seen.push(query);
      return { matches: query === breakpoints.narrow };
    };
    expect(matches('narrow', matchMedia)).toBe(true);
    expect(matches('mobile', matchMedia)).toBe(false);
    expect(seen).toEqual([breakpoints.narrow, breakpoints.mobile]);
  });
});
