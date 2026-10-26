// Pure scroll maths for the sticky experience timeline; the DOM wiring lives in
// scripts/experience-timeline.ts. All inputs are plain numbers in CSS pixels.

export type TimelinePosition = 'before' | 'active' | 'after';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Scroll progress through the tall wrapper, 0 → 1. The sticky stage is pinned for
 * `rectHeight - viewportH` pixels, so that is the travel distance; `max(1, …)` keeps a wrapper
 * that is not taller than the viewport from dividing by zero.
 */
export function progress(rectTop: number, rectHeight: number, viewportH: number): number {
  return clamp(-rectTop / Math.max(1, rectHeight - viewportH), 0, 1);
}

/** The entry shown at progress `p`; `p = 1` stays on the last entry. */
export function activeIndex(p: number, n: number): number {
  return clamp(Math.floor(p * n), 0, Math.max(0, n - 1));
}

/** Rail fill as a fraction of the track: 0 on the first entry, 1 on the last (0 for one entry). */
export function fillFraction(active: number, n: number): number {
  return n > 1 ? clamp(active / (n - 1), 0, 1) : 0;
}

export function positionOf(index: number, active: number): TimelinePosition {
  if (index === active) return 'active';
  return index < active ? 'before' : 'after';
}

/**
 * Document scroll offset that lands in the middle of entry `i`'s slice of the pinned range, so
 * `activeIndex` of the resulting progress is exactly `i`. `sectionTop` is relative to the document.
 */
export function scrollTargetFor(
  i: number,
  n: number,
  sectionTop: number,
  sectionHeight: number,
  viewportH: number,
): number {
  const travel = Math.max(0, sectionHeight - viewportH);
  return sectionTop + (travel * (i + 0.5)) / n;
}
