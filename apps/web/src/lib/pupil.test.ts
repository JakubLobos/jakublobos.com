import { describe, expect, it } from 'vitest';
import { blinkDelay, pupilOffset, PUPIL_MAX_OFFSET_PX } from './pupil.ts';

describe('pupilOffset', () => {
  it('stays centred when the pointer is on the eye centre', () => {
    expect(pupilOffset(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('moves distance / 25 towards a near pointer', () => {
    const { x, y } = pupilOffset(50, 0);
    expect(x).toBeCloseTo(2);
    expect(y).toBeCloseTo(0);
  });

  it('keeps the direction on diagonals', () => {
    const { x, y } = pupilOffset(-30, 40);
    expect(Math.hypot(x, y)).toBeCloseTo(2);
    expect(x / y).toBeCloseTo(-30 / 40);
  });

  it('never exceeds 7 px for a far diagonal pointer', () => {
    const { x, y } = pupilOffset(-3000, 4000);
    expect(Math.hypot(x, y)).toBeCloseTo(PUPIL_MAX_OFFSET_PX);
  });

  it('reaches exactly 7 px from 175 px away', () => {
    expect(pupilOffset(0, 175).y).toBeCloseTo(PUPIL_MAX_OFFSET_PX);
  });
});

describe('blinkDelay', () => {
  it('waits 2 s before the first blink regardless of the RNG', () => {
    expect(blinkDelay(true, () => 0.9)).toBe(2000);
  });

  it('spans 2.5–6 s afterwards', () => {
    expect(blinkDelay(false, () => 0)).toBe(2500);
    expect(blinkDelay(false, () => 0.5)).toBe(4250);
    expect(blinkDelay(false, () => 0.999999)).toBeLessThan(6000);
  });
});
