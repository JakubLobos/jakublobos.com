// Where a confetti burst starts. Pure: the DOM reads live in scripts/confetti.ts.

export interface Rect {
  left: number;
  width: number;
  bottom: number;
}

export interface Origin {
  x: number;
  y: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Bottom-centre of `rect` as a 0..1 fraction of the viewport, which is what canvas-confetti expects. */
export function confettiOrigin(rect: Rect, viewportWidth: number, viewportHeight: number): Origin {
  return {
    x: clamp01((rect.left + rect.width / 2) / viewportWidth),
    y: clamp01(rect.bottom / viewportHeight),
  };
}
