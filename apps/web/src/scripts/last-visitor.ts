import { getLatestGuestbookMessage } from '../lib/api/guestbook.ts';
import { toLatestView, type LatestView } from '../lib/guestbook-latest.ts';
import { tintValue } from '../lib/guestbook-paint.ts';

/** Starts loading shortly before the section scrolls into view, so the quote is usually ready. */
const PRELOAD_MARGIN = '600px 0px';

/**
 * Fetches the newest approved guestbook message and switches the block between its four states
 * (see LastVisitorQuote.astro). The message is untrusted: it only ever goes in via `textContent`.
 */
class LastVisitorElement extends HTMLElement {
  #abort = new AbortController();
  #observer: IntersectionObserver | null = null;
  #loading = false;

  connectedCallback(): void {
    const { signal } = this.#abort;

    this.querySelector('[data-retry]')?.addEventListener(
      'click',
      () => {
        // The retry button is about to be hidden; keep keyboard focus inside the block.
        this.querySelector<HTMLElement>('[data-stage]')?.focus({ preventScroll: true });
        void this.#load();
      },
      { signal },
    );

    this.#observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.#observer?.disconnect();
        void this.#load();
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    this.#observer.observe(this);
  }

  disconnectedCallback(): void {
    this.#abort.abort();
    this.#observer?.disconnect();
    this.#observer = null;
  }

  async #load(): Promise<void> {
    if (this.#loading) return;
    this.#loading = true;
    this.#show({ state: 'loading' });
    const result = await getLatestGuestbookMessage();
    this.#loading = false;
    if (this.isConnected) this.#show(toLatestView(result));
  }

  #show(view: LatestView | { state: 'loading' }): void {
    if (view.state === 'message') {
      const text = this.querySelector('[data-quote-text]');
      if (text) {
        text.textContent = view.body;
        // The marker highlight wraps the text span (ui/Highlight.astro reads `--tint`).
        text.parentElement?.style.setProperty('--tint', tintValue(view.paint));
      }
    }
    this.dataset.state = view.state;
    const stage = this.querySelector('[data-stage]');
    if (view.state === 'loading') stage?.setAttribute('aria-busy', 'true');
    else stage?.removeAttribute('aria-busy');
  }
}

customElements.define('last-visitor', LastVisitorElement);
