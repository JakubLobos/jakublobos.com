import { describe, expect, it } from 'vitest';
import { confettiOrigin } from './confetti-origin.ts';

describe('confettiOrigin', () => {
  it('starts at the bottom-centre of the rect, as viewport fractions', () => {
    const rect = { left: 100, width: 200, bottom: 300 };
    expect(confettiOrigin(rect, 1000, 600)).toEqual({ x: 0.2, y: 0.5 });
  });

  it('clamps a rect that sits outside the viewport', () => {
    expect(confettiOrigin({ left: -500, width: 100, bottom: -20 }, 1000, 600)).toEqual({
      x: 0,
      y: 0,
    });
    expect(confettiOrigin({ left: 1500, width: 100, bottom: 900 }, 1000, 600)).toEqual({
      x: 1,
      y: 1,
    });
  });
});
