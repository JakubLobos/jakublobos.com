// Shared glue for Web Animations, which cannot read CSS custom properties or the user's
// reduced-motion setting on their own.

import { parseCssTime } from '../lib/css-time.ts';

const FALLBACK_MS = 150;

/** Web Animations take no `var()`, so the motion tokens are read from the computed style. */
export function tokenDuration(
  element: Element,
  durationVar: string,
  fallbackMs = FALLBACK_MS,
): number {
  const ms = parseCssTime(getComputedStyle(element).getPropertyValue(durationVar));
  return ms !== null && ms > 0 ? ms : fallbackMs;
}

export function tokenTiming(
  element: Element,
  durationVar: string,
  easingVar: string,
  fill: FillMode = 'none',
): KeyframeAnimationOptions {
  return {
    duration: tokenDuration(element, durationVar),
    easing: getComputedStyle(element).getPropertyValue(easingVar).trim() || 'ease',
    fill,
  };
}

/** Read per call, so a change in the system setting applies without a reload. */
export function prefersReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
