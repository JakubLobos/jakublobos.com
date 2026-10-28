import { DEFAULT_LOCALE, isLocale } from '../i18n/locales.ts';
import { hero } from '../i18n/messages/hero.ts';
import { fetchResume } from '../lib/api/resume.ts';
import { obtainToken } from './turnstile.ts';

const ACTION = 'download-resume';
/** Fixed here rather than read from the response: the API serves one English CV (ADR-0018). */
const FILE_NAME = 'Jakub_Lobos_CV.pdf';
/** Long enough for the browser to start the save; the blob is then no longer needed. */
const REVOKE_DELAY_MS = 1_000;

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

    const setBusy = (next: boolean) => {
      busy = next;
      // Not natively disabled, so keyboard focus stays on the control.
      if (next) {
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
          status.textContent = copy.done;
        } else if (response.kind === 'rate_limited') {
          status.textContent = copy.rateLimited;
        } else if (response.kind === 'unavailable') {
          status.textContent = copy.unavailable;
        } else {
          status.textContent = copy.failed;
        }
      } catch {
        setBusy(false);
        status.textContent = copy.failed;
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
  }
}

if (!customElements.get('resume-download')) {
  customElements.define('resume-download', ResumeDownloadElement);
}
