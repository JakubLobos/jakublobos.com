// Mascot motion maths (design-analysis §4.6). Pure: the DOM reads and writes live in scripts/mascot.ts.

/** A pupil never leaves its eye by more than this many pixels. */
export const PUPIL_MAX_OFFSET_PX = 7;
const PUPIL_DISTANCE_DIVISOR = 25;

const FIRST_BLINK_DELAY_MS = 2000;
const BLINK_MIN_DELAY_MS = 2500;
const BLINK_MAX_DELAY_MS = 6000;

export interface Offset {
  x: number;
  y: number;
}

/** Pupil displacement for a pointer at `(dx, dy)` from the eye centre: same direction, length `min(7, distance / 25)`. */
export function pupilOffset(dx: number, dy: number): Offset {
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: 0, y: 0 };
  const scale = Math.min(PUPIL_MAX_OFFSET_PX, distance / PUPIL_DISTANCE_DIVISOR) / distance;
  return { x: dx * scale, y: dy * scale };
}

/** Wait before a blink: a fixed 2 s for the first one, then 2.5–6 s. `random` returns [0, 1). */
export function blinkDelay(isFirst: boolean, random: () => number = Math.random): number {
  if (isFirst) return FIRST_BLINK_DELAY_MS;
  return BLINK_MIN_DELAY_MS + random() * (BLINK_MAX_DELAY_MS - BLINK_MIN_DELAY_MS);
}
