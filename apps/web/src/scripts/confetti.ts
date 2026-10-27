import type { CreateTypes } from 'canvas-confetti';
import { confettiOrigin } from '../lib/confetti-origin.ts';
import { PAINT_ORDER, PAINTS } from '../lib/paints.ts';

// Bursts from one button closer together than this are ignored.
const THROTTLE_MS = 400;
// canvas-confetti ticks are frames: ~120 of them is about two seconds.
const BURST = { particleCount: 70, angle: 90, spread: 70, startVelocity: 38, ticks: 120 };

const lastBurst = new WeakMap<Element, number>();
let loading: Promise<CreateTypes> | null = null;

/** The library and its canvas load on the first burst, so the page's initial JS stays untouched. */
function load(): Promise<CreateTypes> {
  loading ??= import('canvas-confetti').then(({ default: confetti }) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    // The CSP has no `worker-src blob:`, so the worker renderer is off.
    return confetti.create(canvas, {
      resize: true,
      useWorker: false,
      disableForReducedMotion: true,
    });
  });
  return loading;
}

function paintColors(): string[] {
  const style = getComputedStyle(document.documentElement);
  return PAINT_ORDER.map((id) => style.getPropertyValue(PAINTS[id].swatchVar).trim());
}

/** Fires a paint-coloured burst from the bottom edge of `element`. */
export function burstFrom(element: Element): void {
  const now = performance.now();
  if (now - (lastBurst.get(element) ?? -Infinity) < THROTTLE_MS) return;
  lastBurst.set(element, now);

  const origin = confettiOrigin(
    element.getBoundingClientRect(),
    window.innerWidth,
    window.innerHeight,
  );
  const colors = paintColors();
  load()
    .then((fire) => fire({ ...BURST, origin, colors }))
    // Confetti is decorative: a failed chunk load is dropped (and retried next time), not surfaced.
    .catch(() => {
      loading = null;
    });
}
