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

// Byte comparison: toEqual walks ~1M floats element by element, which is too slow on CI.
const sameBytes = (a: Float32Array, b: Float32Array): boolean =>
  Buffer.from(a.buffer).equals(Buffer.from(b.buffer));

describe('createCity', () => {
  it('draws the same city for the same seed', () => {
    const a = createCity(7);
    const b = createCity(7);
    expect(sameBytes(a.fill, b.fill)).toBe(true);
    expect(sameBytes(a.lines, b.lines)).toBe(true);
    expect(sameBytes(createCity(8).fill, a.fill)).toBe(false);
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
    // A thousand fresh buildings exercise the slot capacities (writeLot throws on overflow).
    for (let t = INTRO_END; rebuilt < 1000; t += 0.5) {
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
