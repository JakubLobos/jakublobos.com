import { scrollForThumbDrag, scrollForTrackClick, thumbMetrics } from '../lib/scrollbar.ts';

interface Drag {
  pointerId: number;
  startY: number;
  startScrollY: number;
  latestY: number;
}

/**
 * Decorative stand-in for the hidden native scrollbar. It only mirrors and drives window
 * scrolling; keyboard, wheel and touch scrolling stay native, so it is aria-hidden and unfocusable.
 */
class SketchScrollbar extends HTMLElement {
  #thumb: HTMLElement | null = null;
  #listeners: AbortController | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #frame = 0;
  #drag: Drag | null = null;

  connectedCallback(): void {
    this.#thumb = this.querySelector<HTMLElement>('[data-thumb]');
    if (!this.#thumb) return;

    this.#listeners = new AbortController();
    const { signal } = this.#listeners;
    window.addEventListener('scroll', this.#schedule, { passive: true, signal });
    window.addEventListener('resize', this.#schedule, { passive: true, signal });
    this.addEventListener('pointerdown', this.#onPointerDown, { signal });
    this.addEventListener('pointermove', this.#onPointerMove, { passive: true, signal });
    this.addEventListener('pointerup', this.#endDrag, { signal });
    this.addEventListener('pointercancel', this.#endDrag, { signal });
    this.addEventListener('lostpointercapture', this.#endDrag, { signal });

    // The document can grow without a window resize (images, fonts, accordions).
    this.#resizeObserver = new ResizeObserver(this.#schedule);
    this.#resizeObserver.observe(document.body);
    this.#schedule();
  }

  disconnectedCallback(): void {
    this.#listeners?.abort();
    this.#listeners = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#finishDrag();
  }

  #schedule = (): void => {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(this.#render);
  };

  #render = (): void => {
    this.#frame = 0;
    const thumb = this.#thumb;
    if (!thumb) return;

    // CSS sizes the track (viewport minus its inset); read it back rather than repeat the inset.
    const track = this.clientHeight;
    const viewportH = window.innerHeight;
    const docH = document.documentElement.scrollHeight;
    if (this.#drag) {
      const top = scrollForThumbDrag(
        track,
        this.#drag.startScrollY,
        this.#drag.latestY - this.#drag.startY,
        viewportH,
        docH,
      );
      window.scrollTo({ top, behavior: 'instant' });
    }

    const metrics = thumbMetrics(track, viewportH, docH, window.scrollY);
    this.toggleAttribute('data-hidden', !metrics.scrollable);
    thumb.style.setProperty('--thumb-h', `${metrics.thumb}px`);
    thumb.style.setProperty('--thumb-y', `${metrics.offset}px`);
    thumb.style.setProperty('--thumb-r', `${metrics.rotation}deg`);
  };

  #onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !(event.target instanceof Node)) return;
    const thumb = this.#thumb;
    if (!thumb) return;

    if (thumb.contains(event.target)) {
      // Without preventDefault the drag would start a text selection.
      event.preventDefault();
      thumb.setPointerCapture(event.pointerId);
      this.#drag = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startScrollY: window.scrollY,
        latestY: event.clientY,
      };
      this.toggleAttribute('data-dragging', true);
      document.body.style.userSelect = 'none';
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: scrollForTrackClick(
        this.clientHeight,
        event.clientY - this.getBoundingClientRect().top,
        window.innerHeight,
        document.documentElement.scrollHeight,
      ),
      behavior: reduceMotion ? 'instant' : 'smooth',
    });
  };

  #onPointerMove = (event: PointerEvent): void => {
    if (this.#drag?.pointerId !== event.pointerId) return;
    this.#drag.latestY = event.clientY;
    this.#schedule();
  };

  #endDrag = (event: PointerEvent): void => {
    if (this.#drag?.pointerId === event.pointerId) this.#finishDrag();
  };

  #finishDrag(): void {
    if (!this.#drag) return;
    this.#drag = null;
    this.removeAttribute('data-dragging');
    document.body.style.removeProperty('user-select');
  }
}

if (!customElements.get('sketch-scrollbar')) {
  customElements.define('sketch-scrollbar', SketchScrollbar);
}
