import { DEFAULT_LOCALE, isLocale } from '../i18n/locales.ts';
import { contactMessages } from '../i18n/messages/contact.ts';
import { revealPhone, type PhoneReveal } from '../lib/api/phone.ts';

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const ACTION = 'reveal-phone';
/** The fake verifier (`HUMAN_VERIFIER=fake`, local development only) accepts exactly this token. */
const FAKE_TOKEN = 'pass';
/** A visitor needs time for an interactive challenge, but not forever. */
const TOKEN_TIMEOUT_MS = 60_000;

interface TurnstileOptions {
  sitekey: string;
  action: string;
  execution: 'execute';
  appearance: 'interaction-only';
  language: string;
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
  'timeout-callback': () => void;
}

interface Turnstile {
  render: (container: HTMLElement, options: TurnstileOptions) => string | undefined;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: unknown;
  }
}

function isTurnstile(value: unknown): value is Turnstile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'render' in value &&
    typeof value.render === 'function' &&
    'execute' in value &&
    typeof value.execute === 'function' &&
    'remove' in value &&
    typeof value.remove === 'function'
  );
}

let loading: Promise<Turnstile> | null = null;

/** Third-party code is fetched only here, on the visitor's click (ADR-0015). */
function loadTurnstile(): Promise<Turnstile> {
  if (loading) return loading;
  const promise = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.addEventListener('load', () => {
      if (isTurnstile(window.turnstile)) resolve(window.turnstile);
      else reject(new Error('Turnstile did not initialise'));
    });
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error('Turnstile failed to load'));
    });
    document.head.append(script);
  });
  loading = promise;
  // A blocked or failed load must be retryable on the next click.
  promise.catch(() => {
    if (loading === promise) loading = null;
  });
  return promise;
}

/** One challenge per call: the token is single-use, so every retry renders and executes anew. */
async function obtainToken(
  widget: HTMLElement,
  siteKey: string,
  language: string,
): Promise<string> {
  if (siteKey === '') return FAKE_TOKEN;
  const turnstile = await loadTurnstile();

  return new Promise<string>((resolve, reject) => {
    // The callbacks below run after `render` returns, so they read the id and timer from here.
    const challenge: { id?: string | undefined; timer?: ReturnType<typeof setTimeout> } = {};
    const settle = (finish: () => void) => {
      clearTimeout(challenge.timer);
      if (challenge.id !== undefined) turnstile.remove(challenge.id);
      widget.replaceChildren();
      finish();
    };
    const fail = () => {
      settle(() => {
        reject(new Error('Turnstile challenge failed'));
      });
    };

    challenge.timer = setTimeout(fail, TOKEN_TIMEOUT_MS);
    challenge.id = turnstile.render(widget, {
      sitekey: siteKey,
      action: ACTION,
      execution: 'execute',
      appearance: 'interaction-only',
      language,
      callback: (token) => {
        settle(() => {
          resolve(token);
        });
      },
      'error-callback': fail,
      'expired-callback': fail,
      'timeout-callback': fail,
    });
    if (challenge.id === undefined) fail();
    else turnstile.execute(challenge.id);
  });
}

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
        failed.textContent = '';
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
      announce.textContent = copy.revealed;
      link.focus();
    };

    const reveal = async () => {
      if (busy) return;
      setBusy(true);
      try {
        const response = await revealPhone(await obtainToken(widget, siteKey, locale));
        if (!response.ok) throw new Error(response.kind);
        show(response.data);
      } catch {
        setBusy(false);
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
