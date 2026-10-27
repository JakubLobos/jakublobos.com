// Shared glue for Web Animations, which cannot read CSS custom properties or the user's
// reduced-motion setting on their own.

const FALLBACK_MS = 150;

/** Web Animations take no `var()`, so the motion tokens are read from the computed style. */
export function tokenTiming(
  element: Element,
  durationVar: string,
  easingVar: string,
  fill: FillMode = 'none',
): KeyframeAnimationOptions {
  const style = getComputedStyle(element);
  const raw = style.getPropertyValue(durationVar).trim();
  // The production CSS minifier rewrites `350ms` to `.35s`, and custom properties keep the text.
  const ms = parseFloat(raw) * (raw.endsWith('ms') ? 1 : 1000);
  return {
    duration: ms > 0 ? ms : FALLBACK_MS,
    easing: style.getPropertyValue(easingVar).trim() || 'ease',
    fill,
  };
}

/** Read per call, so a change in the system setting applies without a reload. */
export function prefersReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
