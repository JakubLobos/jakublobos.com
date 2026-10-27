import { wouldOverflow } from '../lib/input-limit.ts';
import { prefersReducedMotion, tokenTiming } from './motion.ts';

// Kept out of the form scripts so they stay about validation and submission.

const INSERTIONS = new Set(['insertText', 'insertFromPaste', 'insertFromDrop', 'insertLineBreak']);

// `var()` resolves against the counter, so the flash follows the token. The last frame is left
// implicit and lands on the counter's own muted colour.
const FLASH = 'var(--color-danger)';
const FLASH_ONLY: Keyframe[] = [{ color: FLASH, offset: 0.1 }, { color: FLASH, offset: 0.5 }, {}];
const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)', color: FLASH },
  { transform: 'translateX(-3px)', color: FLASH, offset: 0.15 },
  { transform: 'translateX(3px)', color: FLASH, offset: 0.35 },
  { transform: 'translateX(-2px)', color: FLASH, offset: 0.55 },
  { transform: 'translateX(2px)', offset: 0.75 },
  { transform: 'translateX(0)' },
];

/** Characters a `beforeinput` event would add; `null` for deletions, composition and the rest. */
function insertedLength(event: InputEvent): number | null {
  if (event.isComposing || !INSERTIONS.has(event.inputType)) return null;
  if (event.inputType === 'insertLineBreak') return 1;
  // Pastes and drops into a text input may carry `data: null` and the text in `dataTransfer`.
  const text = event.data ?? event.dataTransfer?.getData('text/plain');
  return text === undefined ? null : text.length;
}

/**
 * Flashes and shakes `counter` when the visitor tries to type or paste past `control`'s
 * `maxlength`, which the browser otherwise blocks without a sign. Purely visual: the live
 * regions already announce the limit.
 */
export function bindLimitNudge(
  control: HTMLInputElement | HTMLTextAreaElement,
  counter: HTMLElement,
  signal: AbortSignal,
): void {
  let running: Animation | null = null;
  signal.addEventListener('abort', () => running?.cancel(), { once: true });

  control.addEventListener(
    'beforeinput',
    (event) => {
      const insertLength = event instanceof InputEvent ? insertedLength(event) : null;
      if (insertLength === null) return;
      const { selectionStart, selectionEnd } = control;
      const overflow = wouldOverflow({
        maxLength: control.maxLength,
        valueLength: control.value.length,
        selectionLength: (selectionEnd ?? 0) - (selectionStart ?? 0),
        insertLength,
      });
      if (!overflow) return;
      // Restarting beats stacking when a key is held down.
      running?.cancel();
      running = counter.animate(
        prefersReducedMotion() ? FLASH_ONLY : SHAKE,
        // Linear, because an eased curve would squeeze the swings into the first few milliseconds.
        { ...tokenTiming(counter, '--duration-panel', '--ease-standard'), easing: 'linear' },
      );
    },
    { signal },
  );
}
