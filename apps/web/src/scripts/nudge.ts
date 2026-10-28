import { prefersReducedMotion, tokenDuration } from './motion.ts';

// One shake for every "that did not work" cue, kept out of the logic scripts that trigger it.

// `var()` resolves against the element, so the flash follows the token. The last frame is left
// implicit and lands on the element's own colour.
const FLASH = 'var(--color-danger)';
const FLASH_ONLY: Keyframe[] = [{ color: FLASH, offset: 0.1 }, { color: FLASH, offset: 0.5 }, {}];
const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-3px)', offset: 0.15 },
  { transform: 'translateX(3px)', offset: 0.35 },
  { transform: 'translateX(-2px)', offset: 0.55 },
  { transform: 'translateX(2px)', offset: 0.75 },
  { transform: 'translateX(0)' },
];
// The flash covers the first four frames only, so the colour eases back during the last swings.
const SHAKE_FLASH: Keyframe[] = SHAKE.map((frame, index) =>
  index < 4 ? { ...frame, color: FLASH } : frame,
);

const running = new WeakMap<Element, Animation>();

/**
 * Shakes `element` left and right, optionally flashing its text red. With reduced motion the
 * shake is dropped: the flash alone remains, or nothing (`null`) when there is no flash.
 */
export function nudge(
  element: HTMLElement,
  { flash = false }: { flash?: boolean } = {},
): Animation | null {
  // Restarting beats stacking when the trigger repeats quickly.
  running.get(element)?.cancel();
  const reduced = prefersReducedMotion();
  if (reduced && !flash) return null;
  const keyframes = flash ? (reduced ? FLASH_ONLY : SHAKE_FLASH) : SHAKE;
  const animation = element.animate(keyframes, {
    // Linear, because an eased curve would squeeze the swings into the first few milliseconds.
    duration: tokenDuration(element, '--duration-panel'),
    easing: 'linear',
  });
  running.set(element, animation);
  return animation;
}
