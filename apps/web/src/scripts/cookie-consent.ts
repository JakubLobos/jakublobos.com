import type { ConsentChoice } from '../lib/consent.ts';
import { consentStore } from './consent-store.ts';

// Matches the design's delay; the banner never appears on first paint.
const SHOW_DELAY_MS = 900;

function isChoice(value: string | undefined): value is ConsentChoice {
  return value === 'all' || value === 'essential';
}

/**
 * The consent banner. It appears on its own while no choice is stored, without taking focus
 * (keyboard users reach it by tabbing; it sits last in the DOM). It reopens from the footer's
 * `[data-cookie-settings]` button, and that user-initiated open does move focus onto the banner.
 * After a choice, focus that was inside the banner returns to the footer button.
 */
class CookieBannerElement extends HTMLElement {
  #abort = new AbortController();
  #timer: number | undefined;

  connectedCallback() {
    const banner = this.querySelector<HTMLElement>('[role="region"]');
    if (!banner) return;
    const { signal } = this.#abort;
    const settings = document.querySelectorAll<HTMLElement>('[data-cookie-settings]');

    const show = () => {
      clearTimeout(this.#timer);
      banner.hidden = false;
    };

    const hide = () => {
      clearTimeout(this.#timer);
      const hadFocus = banner.contains(document.activeElement);
      banner.hidden = true;
      if (hadFocus) settings[0]?.focus();
    };

    for (const button of banner.querySelectorAll<HTMLElement>('[data-consent]')) {
      button.addEventListener(
        'click',
        () => {
          const choice = button.dataset.consent;
          if (isChoice(choice)) consentStore.set(choice);
          hide();
        },
        { signal },
      );
    }

    for (const trigger of settings) {
      trigger.addEventListener(
        'click',
        () => {
          show();
          banner.focus();
        },
        { signal },
      );
    }

    // Another tab decided, or cleared the choice.
    const unsubscribe = consentStore.subscribe((state) => {
      if (state === 'unknown') show();
      else hide();
    });
    signal.addEventListener('abort', unsubscribe);

    if (consentStore.get() === 'unknown') {
      this.#timer = window.setTimeout(show, SHOW_DELAY_MS);
    }
  }

  disconnectedCallback() {
    clearTimeout(this.#timer);
    this.#abort.abort();
  }
}

customElements.define('cookie-banner', CookieBannerElement);
