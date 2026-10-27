import { DEFAULT_PAINT, GUESTBOOK_MESSAGE_MAX_LENGTH, type PaintId } from '@portfolio/contracts';
import { isLocale, type Locale } from '../i18n/locales.ts';
import { getSubmissionStatus, submitGuestbookMessage } from '../lib/api/guestbook.ts';
import {
  ANNOUNCE_AT,
  createSubmitController,
  parseFormMessages,
  remainingToAnnounce,
  type FormMessages,
} from '../lib/guestbook-form.ts';
import { isPaintId, tintValue } from '../lib/guestbook-paint.ts';
import {
  APPROVED_EVENT,
  copyFor,
  parseStatusMessages,
  parseStoredSubmission,
  pollDelay,
  serializeSubmission,
  STORAGE_KEY,
  toStatusStep,
  type StatusMessages,
  type StatusView,
  type StoredSubmission,
} from '../lib/guestbook-status.ts';
import { createStatusMotion } from './guestbook-status-motion.ts';

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
  card: HTMLElement;
  eyebrow: HTMLElement;
  title: HTMLElement;
  copy: HTMLElement;
  live: HTMLElement;
  progress: HTMLElement;
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
  const card = modal && find(modal, '[data-card]', HTMLElement);
  const eyebrow = modal && find(modal, '[data-status-eyebrow]', HTMLElement);
  const title = modal && find(modal, '[data-status-title]', HTMLElement);
  const copy = modal && find(modal, '[data-status-copy]', HTMLElement);
  const live = modal && find(modal, '[data-status-live]', HTMLElement);
  const progress = modal && find(modal, '[data-progress]', HTMLElement);
  if (
    !(form && controls && isResettable(field) && body && counter && error && announce) ||
    !(honeypot && submit && modal && echo && modalClose) ||
    !(card && eyebrow && title && copy && live && progress)
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
    card,
    eyebrow,
    title,
    copy,
    live,
    progress,
  };
}

function readStored(): StoredSubmission | null {
  try {
    return parseStoredSubmission(sessionStorage.getItem(STORAGE_KEY), Date.now());
  } catch {
    return null;
  }
}

function writeStored(stored: StoredSubmission | null): void {
  try {
    if (stored === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, serializeSubmission(stored));
  } catch {
    // Private mode or blocked storage: the dialog still works, only the reload-resume is lost.
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/** Resolves at once when the tab is visible, otherwise when it becomes visible (or on abort). */
function untilVisible(signal: AbortSignal): Promise<void> {
  if (!document.hidden) return Promise.resolve();
  return new Promise((resolve) => {
    const done = (): void => {
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    const onChange = (): void => {
      if (!document.hidden) done();
    };
    document.addEventListener('visibilitychange', onChange);
    signal.addEventListener('abort', done, { once: true });
  });
}

function bind(
  parts: Parts,
  messages: FormMessages,
  statusMessages: StatusMessages,
  locale: Locale,
  signal: AbortSignal,
): void {
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

  const motion = createStatusMotion({
    card: parts.card,
    texts: [parts.eyebrow, parts.title, parts.copy],
    signal,
  });

  /** Shows one review state in the dialog; `null` is "still checking". */
  function render(view: StatusView | null): void {
    const copy = copyFor(statusMessages, view);
    const state = view?.state ?? 'checking';
    // Only a change while the dialog is on screen is worth animating; opening it is not one.
    const animated = dialog.open && parts.card.dataset.state !== state;

    parts.card.dataset.state = state;
    // The live region never waits for the animation.
    parts.live.textContent = `${copy.title} ${copy.body}`;
    const write = (): void => {
      parts.eyebrow.textContent = copy.eyebrow;
      parts.title.textContent = copy.title;
      parts.copy.textContent = copy.body;
    };
    if (animated) {
      motion.swap(state, write);
    } else {
      motion.cancel();
      write();
    }
  }

  let watching: AbortController | null = null;

  /**
   * Polls the status endpoint until a terminal answer, a 404 or the time budget ends. It keeps
   * going when the dialog is closed, so an approval still refreshes the quote behind it.
   */
  async function watch(stored: StoredSubmission): Promise<void> {
    watching?.abort();
    const abort = new AbortController();
    watching = abort;
    const stop = abort.signal;
    // A function, so the compiler does not narrow it across the awaits below.
    const stopped = (): boolean => stop.aborted;
    signal.addEventListener(
      'abort',
      () => {
        abort.abort();
      },
      { once: true },
    );

    let elapsed = 0;
    let attempt = 0;
    let final: StatusView = { state: 'slow' };
    for (;;) {
      const wait = pollDelay(attempt, elapsed);
      if (wait === null) break;
      await sleep(wait, stop);
      await untilVisible(stop);
      if (stopped()) return;
      elapsed += wait;
      const startedAt = performance.now();
      const result = await getSubmissionStatus(stored.token);
      if (stopped()) return;
      elapsed += performance.now() - startedAt;
      attempt += 1;
      const step = toStatusStep(result);
      if (step.kind === 'done') {
        final = step.view;
        break;
      }
    }

    // An older watch that was replaced returned above, so only the newest reaches this point.
    writeStored(null);
    watching = null;
    render(final);
    if (final.state === 'approved') document.dispatchEvent(new CustomEvent(APPROVED_EVENT));
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
        parts.progress.style.setProperty('--tint', tintValue(outcome.paint));
        render(null);
        // Written again once the dialog is visible, so the polite region announces the first state.
        parts.live.textContent = '';
        dialog.showModal();
        parts.modalClose.focus();
        parts.live.textContent = `${statusMessages.checking.title} ${statusMessages.checking.body}`;
        {
          const stored = {
            token: outcome.clientRequestId,
            sentAt: Date.now(),
            tint: outcome.paint,
          };
          writeStored(stored);
          void watch(stored);
        }
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

  // A reload mid-review keeps watching quietly (the text is not kept, so the dialog stays closed).
  const resumed = readStored();
  if (resumed !== null) void watch(resumed);

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
      const statusMessages = parseStatusMessages(parts?.dialog.dataset.messages);
      if (!messages || !statusMessages || !isLocale(locale) || !parts) return;
      bind(parts, messages, statusMessages, locale, abort.signal);
    });
  }

  disconnectedCallback(): void {
    this.#abort?.abort();
    this.#abort = null;
  }
}

customElements.define('guestbook-form', GuestbookFormElement);
