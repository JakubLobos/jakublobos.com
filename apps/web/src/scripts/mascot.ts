import { blinkDelay, pupilOffset } from '../lib/pupil.ts';
import { tokenDuration } from './motion.ts';

// Used only if `--duration-blink` is missing or unparsable.
const BLINK_FALLBACK_MS = 180;

// Reduced motion: no tracking, no blinking. Forced colours hides the mascot, so there is nothing to animate.
const MOTION_OFF = '(prefers-reduced-motion: reduce), (forced-colors: active)';
const FINE_POINTER = '(pointer: fine)';

interface Eye {
  eye: HTMLElement;
  pupil: HTMLElement;
}

interface Point {
  x: number;
  y: number;
}

/** `<hero-mascot>`: pupils follow a fine pointer and both eyes blink at random intervals. */
class HeroMascot extends HTMLElement {
  readonly #motionOff = matchMedia(MOTION_OFF);
  readonly #finePointer = matchMedia(FINE_POINTER);
  #eyes: Eye[] = [];
  #pointer: Point | null = null;
  #frame = 0;
  #tracking = false;
  #blinkTimer: number | undefined;
  #hasBlinked = false;

  connectedCallback(): void {
    this.#eyes = [...this.querySelectorAll<HTMLElement>('[data-eye]')].flatMap((eye) => {
      const pupil = eye.querySelector<HTMLElement>('[data-pupil]');
      return pupil ? [{ eye, pupil }] : [];
    });
    this.#motionOff.addEventListener('change', this.#sync);
    this.#finePointer.addEventListener('change', this.#sync);
    document.addEventListener('visibilitychange', this.#sync);
    this.#sync();
  }

  disconnectedCallback(): void {
    this.#motionOff.removeEventListener('change', this.#sync);
    this.#finePointer.removeEventListener('change', this.#sync);
    document.removeEventListener('visibilitychange', this.#sync);
    this.#setTracking(false);
    this.#setBlinking(false);
  }

  /** Re-evaluates what may run after a media query or the tab visibility changed. */
  readonly #sync = (): void => {
    const motion = !this.#motionOff.matches;
    this.#setTracking(motion && this.#finePointer.matches);
    this.#setBlinking(motion && !document.hidden);
  };

  #setTracking(on: boolean): void {
    if (on === this.#tracking) return;
    this.#tracking = on;
    if (on) {
      window.addEventListener('pointermove', this.#onPointerMove, { passive: true });
      return;
    }
    window.removeEventListener('pointermove', this.#onPointerMove);
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#pointer = null;
    for (const { pupil } of this.#eyes) {
      pupil.style.removeProperty('--pupil-x');
      pupil.style.removeProperty('--pupil-y');
    }
  }

  readonly #onPointerMove = (event: PointerEvent): void => {
    this.#pointer = { x: event.clientX, y: event.clientY };
    this.#frame ||= requestAnimationFrame(this.#look);
  };

  readonly #look = (): void => {
    this.#frame = 0;
    const pointer = this.#pointer;
    if (!pointer) return;
    // Read every eye before writing any pupil so the frame costs one layout pass.
    const offsets = this.#eyes.map(({ eye }) => {
      const rect = eye.getBoundingClientRect();
      return pupilOffset(
        pointer.x - (rect.left + rect.width / 2),
        pointer.y - (rect.top + rect.height / 2),
      );
    });
    this.#eyes.forEach(({ pupil }, i) => {
      const offset = offsets[i];
      if (!offset) return;
      pupil.style.setProperty('--pupil-x', `${offset.x}px`);
      pupil.style.setProperty('--pupil-y', `${offset.y}px`);
    });
  };

  #setBlinking(on: boolean): void {
    if (!on) {
      clearTimeout(this.#blinkTimer);
      this.#blinkTimer = undefined;
    } else if (this.#blinkTimer === undefined) {
      this.#scheduleBlink();
    }
  }

  #scheduleBlink(): void {
    this.#blinkTimer = window.setTimeout(() => {
      this.#hasBlinked = true;
      this.#blink();
      this.#scheduleBlink();
    }, blinkDelay(!this.#hasBlinked));
  }

  #blink(): void {
    // The individual `scale` property leaves each eye's tilt (`transform: rotate`) intact.
    for (const { eye } of this.#eyes) {
      eye.animate([{ scale: '1 1' }, { scale: '1 0.1' }, { scale: '1 1' }], {
        duration: tokenDuration(this, '--duration-blink', BLINK_FALLBACK_MS),
        easing: 'ease-in-out',
      });
    }
  }
}

customElements.define('hero-mascot', HeroMascot);
