import type { CreateTypes } from 'canvas-confetti';
import { confettiOrigin } from '../lib/confetti-origin.ts';
import { PAINT_ORDER, PAINTS } from '../lib/paints.ts';

// Bursts from one button closer together than this are ignored.
const THROTTLE_MS = 400;
// canvas-confetti ticks are frames: ~120 of them is about two seconds.
const BURST = { particleCount: 70, angle: 90, spread: 70, startVelocity: 38, ticks: 120 };
const FALLBACK_Z_INDEX = 6;

const lastBurst = new WeakMap<Element, number>();
let loading: Promise<CreateTypes> | null = null;

/** The library loads on the first burst, so the page's initial JS stays untouched. */
function load(): Promise<CreateTypes> {
  // Without a canvas the library makes its own and removes it when the animation ends.
  // The CSP has no `worker-src blob:`, so the worker renderer is off.
  loading ??= import('canvas-confetti').then(({ default: confetti }) =>
    confetti.create(undefined, { resize: true, useWorker: false }),
  );
  return loading;
}

function paintColors(style: CSSStyleDeclaration): string[] {
  return PAINT_ORDER.map((id) => style.getPropertyValue(PAINTS[id].swatchVar).trim());
}

/** Fires a paint-coloured burst from the bottom edge of `element`. */
export function burstFrom(element: Element): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const now = performance.now();
  if (now - (lastBurst.get(element) ?? -Infinity) < THROTTLE_MS) return;
  lastBurst.set(element, now);

  const origin = confettiOrigin(
    element.getBoundingClientRect(),
    window.innerWidth,
    window.innerHeight,
  );
  const style = getComputedStyle(document.documentElement);
  const zIndex = Number.parseInt(style.getPropertyValue('--z-confetti'), 10) || FALLBACK_Z_INDEX;
  const colors = paintColors(style);
  load()
    .then((fire) => fire({ ...BURST, origin, colors, zIndex }))
    // Confetti is decorative: a failed chunk load is dropped (and retried next time), not surfaced.
    .catch(() => {
      loading = null;
    });
}
