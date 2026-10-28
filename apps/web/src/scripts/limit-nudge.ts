import { wouldOverflow } from '../lib/input-limit.ts';
import { nudge } from './nudge.ts';

// Kept out of the form scripts so they stay about validation and submission.

const INSERTIONS = new Set(['insertText', 'insertFromPaste', 'insertFromDrop', 'insertLineBreak']);

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
      running = nudge(counter, { flash: true });
    },
    { signal },
  );
}
