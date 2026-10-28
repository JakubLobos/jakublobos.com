import { DEFAULT_LOCALE, isLocale } from '../i18n/locales.ts';
import { hero } from '../i18n/messages/hero.ts';
import { fetchResume } from '../lib/api/resume.ts';
import { nudge } from './nudge.ts';
import { obtainToken } from './turnstile.ts';

const ACTION = 'download-resume';
/** Fixed here rather than read from the response: the API serves one English CV (ADR-0018). */
const FILE_NAME = 'Jakub_Lobos_CV.pdf';
/** Long enough for the browser to start the save; the blob is then no longer needed. */
const REVOKE_DELAY_MS = 1_000;
/** Long enough to read the outcome; the live region has already announced it. */
const CLEAR_DELAY_MS = 10_000;

function saveBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = FILE_NAME;
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, REVOKE_DELAY_MS);
}

/**
 * The hero "Get my resume" control: runs a Turnstile check like the phone reveal, then downloads
 * the PDF from the API. The file is not a static asset because it contains a phone number.
 */
class ResumeDownloadElement extends HTMLElement {
  #abort: AbortController | null = null;
  #clearTimer: ReturnType<typeof setTimeout> | undefined;

  connectedCallback(): void {
    const button = this.querySelector('[data-resume]');
    const status = this.querySelector('[data-status]');
    const widget = this.querySelector('[data-widget]');
    if (
      !(button instanceof HTMLElement) ||
      !(status instanceof HTMLElement) ||
      !(widget instanceof HTMLElement)
    ) {
      return;
    }

    const locale = isLocale(this.dataset.locale) ? this.dataset.locale : DEFAULT_LOCALE;
    const copy = hero(locale).resumeStatus;
    const siteKey = this.dataset.siteKey ?? '';
    let busy = false;

    const clearTimer = () => {
      clearTimeout(this.#clearTimer);
      this.#clearTimer = undefined;
    };

    // Every outcome goes through here so a newer message always restarts the countdown.
    const show = (text: string, failed: boolean) => {
      clearTimer();
      status.textContent = text;
      if (failed) nudge(button);
      this.#clearTimer = setTimeout(() => {
        status.textContent = '';
      }, CLEAR_DELAY_MS);
    };

    const setBusy = (next: boolean) => {
      busy = next;
      // Not natively disabled, so keyboard focus stays on the control.
      if (next) {
        clearTimer();
        button.setAttribute('aria-busy', 'true');
        button.dataset.busy = '';
        status.textContent = copy.busy;
      } else {
        button.removeAttribute('aria-busy');
        delete button.dataset.busy;
      }
    };

    const download = async () => {
      if (busy) return;
      setBusy(true);
      try {
        const token = await obtainToken({ widget, siteKey, language: locale, action: ACTION });
        const response = await fetchResume(token);
        setBusy(false);
        if (response.ok) {
          saveBlob(response.data);
          show(copy.done, false);
        } else if (response.kind === 'rate_limited') {
          show(copy.rateLimited, true);
        } else if (response.kind === 'unavailable') {
          show(copy.unavailable, true);
        } else {
          show(copy.failed, true);
        }
      } catch {
        setBusy(false);
        show(copy.failed, true);
      }
    };

    this.#abort = new AbortController();
    button.addEventListener(
      'click',
      () => {
        void download();
      },
      { signal: this.#abort.signal },
    );
  }

  disconnectedCallback(): void {
    this.#abort?.abort();
    this.#abort = null;
    clearTimeout(this.#clearTimer);
    this.#clearTimer = undefined;
  }
}

if (!customElements.get('resume-download')) {
  customElements.define('resume-download', ResumeDownloadElement);
}
