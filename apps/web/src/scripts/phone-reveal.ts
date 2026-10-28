import { DEFAULT_LOCALE, isLocale } from '../i18n/locales.ts';
import { contactMessages } from '../i18n/messages/contact.ts';
import { revealPhone, type PhoneReveal } from '../lib/api/phone.ts';
import { obtainToken } from './turnstile.ts';

const ACTION = 'reveal-phone';

/**
 * The PHONE row: "Show number" runs a Turnstile check, asks the API for the number and swaps the
 * button for a `tel:` link. The number lives only in this DOM node; nothing is stored.
 */
class PhoneRevealElement extends HTMLElement {
  #abort: AbortController | null = null;

  connectedCallback(): void {
    const button = this.querySelector('[data-reveal]');
    const result = this.querySelector('[data-result]');
    const failed = this.querySelector('[data-failed]');
    const announce = this.querySelector('[data-announce]');
    const widget = this.querySelector('[data-widget]');
    if (
      !(button instanceof HTMLButtonElement) ||
      !(result instanceof HTMLElement) ||
      !(failed instanceof HTMLElement) ||
      !(announce instanceof HTMLElement) ||
      !(widget instanceof HTMLElement)
    ) {
      return;
    }

    const locale = isLocale(this.dataset.locale) ? this.dataset.locale : DEFAULT_LOCALE;
    const copy = contactMessages(locale).phone;
    const siteKey = this.dataset.siteKey ?? '';
    let busy = false;

    const setBusy = (next: boolean) => {
      busy = next;
      button.textContent = next ? copy.verifying : copy.show;
      if (next) {
        button.setAttribute('aria-busy', 'true');
      } else {
        button.removeAttribute('aria-busy');
      }
    };

    const show = ({ display, tel }: PhoneReveal) => {
      // Built with setAttribute/textContent: the response is data, never markup.
      const link = document.createElement('a');
      link.setAttribute('href', `tel:${tel}`);
      link.textContent = display;
      result.replaceChildren(link);
      button.remove();
      failed.textContent = '';
      announce.textContent = copy.revealed;
      link.focus();
    };

    const reveal = async () => {
      if (busy) return;
      setBusy(true);
      try {
        const response = await revealPhone(
          await obtainToken({ widget, siteKey, language: locale, action: ACTION }),
        );
        if (!response.ok) throw new Error(response.kind);
        show(response.data);
      } catch {
        setBusy(false);
        // The old message stays while verifying, so nothing shifts below it.
        failed.textContent = copy.failed;
      }
    };

    this.#abort = new AbortController();
    button.addEventListener(
      'click',
      () => {
        void reveal();
      },
      { signal: this.#abort.signal },
    );
  }

  disconnectedCallback(): void {
    this.#abort?.abort();
    this.#abort = null;
  }
}

if (!customElements.get('phone-reveal')) customElements.define('phone-reveal', PhoneRevealElement);
