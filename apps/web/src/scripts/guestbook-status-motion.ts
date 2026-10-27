import type { StatusView } from '../lib/guestbook-status.ts';
import { prefersReducedMotion, tokenTiming } from './motion.ts';

// Kept out of guestbook-form.ts so that file stays about the form, the submission and the polling.

const INK_OUT: Keyframe[] = [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-0.3em)' }];
const INK_IN: Keyframe[] = [{ opacity: 0, transform: 'translateY(0.3em)' }, { opacity: 1 }];

// One-shot accents on the card when the review ends (approved settles, the others get a nudge).
const SETTLE: Keyframe[] = [
  { transform: 'scale(1) rotate(0)' },
  { transform: 'scale(1.03) rotate(-0.8deg)', offset: 0.35 },
  { transform: 'scale(0.99) rotate(0.3deg)', offset: 0.7 },
  { transform: 'scale(1) rotate(0)' },
];
const NUDGE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px)', offset: 0.2 },
  { transform: 'translateX(5px)', offset: 0.45 },
  { transform: 'translateX(-3px)', offset: 0.7 },
  { transform: 'translateX(0)' },
];
const ACCENTS: Partial<Record<StatusView['state'], Keyframe[]>> = {
  approved: SETTLE,
  rejected: NUDGE,
  superseded: NUDGE,
};

export interface StatusMotion {
  /**
   * Replaces the status texts: at once under reduced motion, otherwise the old texts lift away,
   * `write` runs and the new ones settle in, plus the outcome accent on the card. A newer call or
   * `cancel()` stops the running animations, which rejects `finished` and leaves the text to the
   * newer call.
   */
  swap: (state: StatusView['state'] | 'checking', write: () => void) => void;
  cancel: () => void;
}

export function createStatusMotion({
  card,
  texts,
  signal,
}: {
  card: HTMLElement;
  texts: readonly HTMLElement[];
  signal: AbortSignal;
}): StatusMotion {
  let inking: Animation[] = [];

  function cancel(): void {
    for (const animation of inking) animation.cancel();
    inking = [];
  }
  signal.addEventListener('abort', cancel, { once: true });

  async function reink(write: () => void): Promise<void> {
    const timing = tokenTiming(card, '--duration-hover', '--ease-type', 'both');
    const out = texts.map((element) => element.animate(INK_OUT, timing));
    inking = out;
    try {
      await Promise.all(out.map((animation) => animation.finished));
    } catch {
      return;
    }
    // Held open by `fill`; released in the same task as the write, so no frame shows the old text.
    for (const animation of out) animation.cancel();
    write();
    inking = texts.map((element) => element.animate(INK_IN, timing));
  }

  return {
    swap(state, write) {
      cancel();
      if (prefersReducedMotion()) {
        write();
        return;
      }
      void reink(write);
      const accent = state === 'checking' ? undefined : ACCENTS[state];
      if (accent) {
        card.animate(accent, tokenTiming(card, '--duration-panel', '--ease-standard'));
      }
    },
    cancel,
  };
}
