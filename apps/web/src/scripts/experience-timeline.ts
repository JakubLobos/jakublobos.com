import { breakpoints } from '../lib/breakpoints.ts';
import {
  activeIndex,
  fillFraction,
  positionOf,
  progress,
  scrollTargetFor,
} from '../lib/timeline.ts';

/**
 * Progressive enhancement of the stacked experience list: in a roomy viewport the wrapper becomes
 * a tall scroll track, the stage sticks, and scroll progress picks the visible entry. Everything
 * else (layout, transitions, colours) is CSS keyed off the attributes set here.
 */
class ExperienceTimeline extends HTMLElement {
  #compact = window.matchMedia(breakpoints.compactExperience);
  #steps: readonly HTMLButtonElement[] = [];
  #panels: readonly HTMLElement[] = [];
  #frame = 0;
  #active = -1;

  constructor() {
    super();
    // Delegated and bound once: the rail is only reachable in sticky mode, so nothing needs
    // adding or removing when the mode flips.
    this.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      const step = event.target.closest<HTMLButtonElement>('[data-step]');
      const index = step ? this.#steps.indexOf(step) : -1;
      if (index >= 0) this.#scrollToStep(index);
    });
  }

  connectedCallback(): void {
    this.#steps = [...this.querySelectorAll<HTMLButtonElement>('[data-step]')];
    this.#panels = [...this.querySelectorAll<HTMLElement>('[data-panel]')];
    this.#compact.addEventListener('change', this.#sync);
    this.#sync();
  }

  disconnectedCallback(): void {
    this.#compact.removeEventListener('change', this.#sync);
    this.#leaveSticky();
  }

  #sync = (): void => {
    if (this.#compact.matches) this.#leaveSticky();
    else this.#enterSticky();
  };

  #enterSticky(): void {
    if (this.dataset.mode === 'sticky') return;
    this.dataset.mode = 'sticky';
    this.style.setProperty('--exp-count', String(this.#panels.length));
    window.addEventListener('scroll', this.#schedule, { passive: true });
    window.addEventListener('resize', this.#schedule, { passive: true });
    this.#update();
  }

  #leaveSticky(): void {
    if (this.dataset.mode !== 'sticky') return;
    window.removeEventListener('scroll', this.#schedule);
    window.removeEventListener('resize', this.#schedule);
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#active = -1;
    delete this.dataset.mode;
    this.style.removeProperty('--exp-count');
    this.style.removeProperty('--exp-fill');
    for (const el of [...this.#steps, ...this.#panels]) delete el.dataset.position;
    for (const step of this.#steps) step.removeAttribute('aria-current');
  }

  // Scroll and resize fire faster than frames; one measurement per frame is enough.
  #schedule = (): void => {
    if (this.#frame !== 0) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.#update();
    });
  };

  #update(): void {
    const n = this.#panels.length;
    const rect = this.getBoundingClientRect();
    const active = activeIndex(progress(rect.top, rect.height, window.innerHeight), n);
    if (active === this.#active) return;
    this.#active = active;

    this.style.setProperty('--exp-fill', String(fillFraction(active, n)));
    this.#steps.forEach((step, i) => {
      step.dataset.position = positionOf(i, active);
      if (i === active) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    this.#panels.forEach((panel, i) => {
      panel.dataset.position = positionOf(i, active);
    });
  }

  #scrollToStep(i: number): void {
    const rect = this.getBoundingClientRect();
    const top = scrollTargetFor(
      i,
      this.#panels.length,
      rect.top + window.scrollY,
      rect.height,
      window.innerHeight,
    );
    // No `behavior`: the page's CSS `scroll-behavior` decides, so reduced motion jumps.
    window.scrollTo({ top });
  }
}

if (!customElements.get('experience-timeline')) {
  customElements.define('experience-timeline', ExperienceTimeline);
}
