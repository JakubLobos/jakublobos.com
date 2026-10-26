import { describe, expect, it } from 'vitest';
import { activeIndex, fillFraction, positionOf, progress, scrollTargetFor } from './timeline.ts';

describe('progress', () => {
  // 260vh wrapper in a 1000px viewport: 2600px tall, 1600px of pinned travel.
  it('is 0 before the wrapper reaches the top and 1 once its end is pinned', () => {
    expect(progress(300, 2600, 1000)).toBe(0);
    expect(progress(0, 2600, 1000)).toBe(0);
    expect(progress(-1600, 2600, 1000)).toBe(1);
    expect(progress(-5000, 2600, 1000)).toBe(1);
  });

  it('is linear in between', () => {
    expect(progress(-800, 2600, 1000)).toBe(0.5);
  });

  it('does not divide by zero when the wrapper is not taller than the viewport', () => {
    expect(progress(-10, 800, 1000)).toBe(1);
    expect(progress(0, 1000, 1000)).toBe(0);
  });
});

describe('activeIndex', () => {
  it('splits the range into n equal slices', () => {
    expect([0, 0.32, 0.34, 0.66, 0.67].map((p) => activeIndex(p, 3))).toEqual([0, 0, 1, 1, 2]);
  });

  it('keeps p = 1 on the last entry', () => {
    expect(activeIndex(1, 3)).toBe(2);
  });

  it('handles a single entry and an empty list', () => {
    expect(activeIndex(0, 1)).toBe(0);
    expect(activeIndex(1, 1)).toBe(0);
    expect(activeIndex(0.5, 0)).toBe(0);
  });
});

describe('fillFraction', () => {
  it('maps the first and last entry to 0 and 1', () => {
    expect([0, 1, 2].map((i) => fillFraction(i, 3))).toEqual([0, 0.5, 1]);
  });

  it('is 0 for a single entry', () => {
    expect(fillFraction(0, 1)).toBe(0);
  });
});

describe('positionOf', () => {
  it('labels entries relative to the active one', () => {
    expect([0, 1, 2].map((i) => positionOf(i, 1))).toEqual(['before', 'active', 'after']);
  });
});

describe('scrollTargetFor', () => {
  it('targets the middle of each entry slice, offset by the section top', () => {
    // Section at document y=500, 2600px tall, 1000px viewport: 1600px of travel.
    expect([0, 1, 2].map((i) => scrollTargetFor(i, 3, 500, 2600, 1000))).toEqual([
      500 + 1600 / 6,
      500 + 800,
      500 + (1600 * 5) / 6,
    ]);
  });

  it('round-trips through progress and activeIndex for every entry', () => {
    const [top, height, viewport, n] = [500, 2600, 1000, 3] as const;
    for (let i = 0; i < n; i += 1) {
      const scrollY = scrollTargetFor(i, n, top, height, viewport);
      expect(activeIndex(progress(top - scrollY, height, viewport), n)).toBe(i);
    }
  });

  it('stays at the section top when there is no travel', () => {
    expect(scrollTargetFor(0, 1, 500, 800, 1000)).toBe(500);
  });
});
