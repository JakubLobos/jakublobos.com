import { DEFAULT_PAINT, GUESTBOOK_MESSAGE_MAX_LENGTH, type PaintId } from '@portfolio/contracts';
import { isLocale, type Locale } from '../i18n/locales.ts';
import { submitGuestbookMessage } from '../lib/api/guestbook.ts';
import {
  ANNOUNCE_AT,
  createSubmitController,
  parseFormMessages,
  remainingToAnnounce,
  type FormMessages,
} from '../lib/guestbook-form.ts';
import { isPaintId, tintValue } from '../lib/guestbook-paint.ts';

interface Resettable extends HTMLElement {
  reset: () => void;
}

/** `typing-field` (ui/TypingField.astro) clears its value and mirror through `reset()`. */
function isResettable(element: Element | null): element is Resettable {
  return (
    element instanceof HTMLElement && 'reset' in element && typeof element.reset === 'function'
  );
}

function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T | null {
  const found = root.querySelector(selector);
  return found instanceof type ? found : null;
}

interface Parts {
  form: HTMLFormElement;
  controls: HTMLFieldSetElement;
  field: Resettable;
  body: HTMLInputElement;
  counter: HTMLElement;
  error: HTMLElement;
  announce: HTMLElement;
  honeypot: HTMLInputElement;
  submit: HTMLButtonElement;
  dialog: HTMLDialogElement;
  echo: HTMLElement;
  modalClose: HTMLButtonElement;
}

function collect(root: HTMLElement, dialog: HTMLElement | null): Parts | null {
  const form = find(root, 'form', HTMLFormElement);
  const controls = find(root, '[data-controls]', HTMLFieldSetElement);
  const field = root.querySelector('typing-field');
  const body = find(root, 'input[name="body"]', HTMLInputElement);
  const counter = find(root, '[data-counter]', HTMLElement);
  const error = find(root, '[data-error]', HTMLElement);
  const announce = find(root, '[data-announce]', HTMLElement);
  const honeypot = find(root, 'input[name="website"]', HTMLInputElement);
  const submit = find(root, '[data-submit]', HTMLButtonElement);
  const modal = dialog instanceof HTMLDialogElement ? dialog : null;
  const echo = modal && find(modal, '[data-echo-text]', HTMLElement);
  const modalClose = modal && find(modal, '[data-modal-close]', HTMLButtonElement);
  if (
    !(form && controls && isResettable(field) && body && counter && error && announce) ||
    !(honeypot && submit && modal && echo && modalClose)
  ) {
    return null;
  }
  return {
    form,
    controls,
    field,
    body,
    counter,
    error,
    announce,
    honeypot,
    submit,
    dialog: modal,
    echo,
    modalClose,
  };
}

function bind(parts: Parts, messages: FormMessages, locale: Locale, signal: AbortSignal): void {
  const { form, controls, field, body, counter, error, announce, honeypot, submit, dialog } = parts;
  let previousLength = 0;
  let submitHadFocus = false;

  function syncCounter(): void {
    const { length } = body.value;
    counter.textContent = `${String(length)}/${String(GUESTBOOK_MESSAGE_MAX_LENGTH)}`;
    const remaining = remainingToAnnounce(previousLength, length);
    previousLength = length;
    if (remaining !== null) {
      announce.textContent =
        remaining === 0
          ? messages.limitReached
          : messages.charsLeft.replace('{n}', String(remaining));
    } else if (length < ANNOUNCE_AT[0]) {
      // Clearing lets the same message be announced again when the visitor re-crosses the limit.
      announce.textContent = '';
    }
  }

  function showError(text: string, invalid: boolean): void {
    error.textContent = text;
    if (invalid) body.setAttribute('aria-invalid', 'true');
  }

  function clearError(): void {
    error.textContent = '';
    body.removeAttribute('aria-invalid');
  }

  /** The Button primitive's "sending" look: native disabled, aria-busy and `data-busy`. */
  function setBusy(busy: boolean): void {
    if (busy) {
      submitHadFocus = document.activeElement === submit;
      // The label changes to "Sending…"; pinning the width keeps the button from jumping.
      submit.style.setProperty('min-width', `${String(submit.offsetWidth)}px`);
      submit.setAttribute('aria-busy', 'true');
    } else {
      submit.style.removeProperty('min-width');
      submit.removeAttribute('aria-busy');
    }
    submit.disabled = busy;
    submit.toggleAttribute('data-busy', busy);
    // Read-only rather than disabled, so the field keeps focus and the text can't change mid-send.
    body.readOnly = busy;
    // A disabled button drops focus; hand it back for keyboard users.
    if (!busy && submitHadFocus) submit.focus();
  }

  const controller = createSubmitController({
    send: submitGuestbookMessage,
    newId: () => crypto.randomUUID(),
    onBusyChange: setBusy,
  });

  function selectedPaint(): PaintId {
    const checked = form.querySelector<HTMLInputElement>('input[name="paint"]:checked');
    return checked && isPaintId(checked.value) ? checked.value : DEFAULT_PAINT;
  }

  async function submitMessage(): Promise<void> {
    clearError();
    const outcome = await controller.submit({
      raw: body.value,
      paint: selectedPaint(),
      locale,
      website: honeypot.value,
    });

    switch (outcome.kind) {
      case 'ignored':
        break;
      case 'empty':
        body.focus();
        break;
      case 'field-error':
        showError(messages.fieldErrors[outcome.code], true);
        body.focus();
        break;
      case 'failed':
        showError(outcome.reason === 'rate_limited' ? messages.rateLimited : messages.retry, false);
        break;
      case 'sent':
        // Fires `input`, which also resyncs the counter.
        field.reset();
        parts.echo.textContent = outcome.body;
        // The marker highlight wraps the text span (ui/Highlight.astro reads `--tint`).
        parts.echo.parentElement?.style.setProperty('--tint', tintValue(outcome.paint));
        dialog.showModal();
        parts.modalClose.focus();
        break;
    }
  }

  const opts = { signal };

  body.addEventListener(
    'input',
    () => {
      syncCounter();
      clearError();
    },
    opts,
  );
  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      void submitMessage();
    },
    opts,
  );
  // Form restoration and the back-forward cache change the value without an input event.
  window.addEventListener('pageshow', syncCounter, opts);

  // A press that starts on the card and ends on the backdrop (text selection) must not close it.
  let pressedBackdrop = false;
  dialog.addEventListener(
    'pointerdown',
    (event) => {
      pressedBackdrop = event.target === dialog;
    },
    opts,
  );
  dialog.addEventListener(
    'click',
    (event) => {
      if (pressedBackdrop && event.target === dialog) dialog.close();
    },
    opts,
  );
  parts.modalClose.addEventListener(
    'click',
    () => {
      dialog.close();
    },
    opts,
  );
  // Fires for every way of closing (button, Escape, backdrop).
  dialog.addEventListener(
    'close',
    () => {
      body.focus();
    },
    opts,
  );

  syncCounter();
  // The controls ship disabled; only a working script enables them (NFR-13).
  controls.disabled = false;
}

/** Wires the form, its counter, the submit flow and the confirmation dialog (GuestbookForm.astro). */
class GuestbookFormElement extends HTMLElement {
  #abort: AbortController | null = null;

  connectedCallback(): void {
    const abort = new AbortController();
    this.#abort = abort;
    // The two scripts load independently; `reset()` exists only once the field is upgraded.
    void customElements.whenDefined('typing-field').then(() => {
      if (abort.signal.aborted) return;
      const messages = parseFormMessages(this.dataset.messages);
      const { locale, modal } = this.dataset;
      const parts = collect(this, modal ? document.getElementById(modal) : null);
      if (!messages || !isLocale(locale) || !parts) return;
      bind(parts, messages, locale, abort.signal);
    });
  }

  disconnectedCallback(): void {
    this.#abort?.abort();
    this.#abort = null;
  }
}

customElements.define('guestbook-form', GuestbookFormElement);
