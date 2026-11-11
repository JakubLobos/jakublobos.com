import { describe, expect, it } from 'vitest';
import {
  createCity,
  INTRO_END,
  LOT_INDICES,
  LOT_VERTICES,
  Rebuilder,
  STATE_WIDTH,
} from './city.ts';
import { KIND, LINE_STRIDE } from './geometry.ts';

describe('createCity', () => {
  it('draws the same city for the same seed', () => {
    const a = createCity(7);
    const b = createCity(7);
    expect(a.fill).toEqual(b.fill);
    expect(a.lines).toEqual(b.lines);
    expect(createCity(8).fill).not.toEqual(a.fill);
  });

  it('keeps every index inside its own building slot', () => {
    const city = createCity();
    expect(city.lots.length).toBeGreaterThan(50);
    for (const lot of city.lots) {
      const v0 = city.base.fill + lot.slot * LOT_VERTICES;
      const slot = city.index.subarray(
        city.base.index + lot.slot * LOT_INDICES,
        city.base.index + (lot.slot + 1) * LOT_INDICES,
      );
      expect(Math.min(...slot)).toBeGreaterThanOrEqual(v0);
      expect(Math.max(...slot)).toBeLessThan(v0 + LOT_VERTICES);
    }
    expect(city.state.length % (STATE_WIDTH * 4)).toBe(0);
  });
});

describe('Rebuilder', () => {
  it('strips one building, then rebuilds it in place without overflowing its slot', () => {
    const city = createCity();
    const rebuilder = new Rebuilder(city);
    expect(rebuilder.step(INTRO_END - 1)).toBeUndefined();

    let rebuilt = 0;
    // Thousands of fresh buildings exercise the slot capacities (writeLot throws on overflow).
    for (let t = INTRO_END; rebuilt < 3000; t += 0.5) {
      const change = rebuilder.step(t);
      if (!change) continue;
      const strip = city.state[change.obj * 4 + 1];
      if ('fill' in change) {
        rebuilt++;
        expect(strip).toBe(-1);
        expect(city.state[change.obj * 4]).toBeCloseTo(t + 0.1);
        const kinds = city.lines
          .subarray(change.lines[0], change.lines[1])
          .filter((_, k) => k % LINE_STRIDE === 4);
        expect(kinds.some((kind) => kind === KIND.wire)).toBe(true);
      } else {
        expect(strip).toBe(t);
      }
    }
  });
});
