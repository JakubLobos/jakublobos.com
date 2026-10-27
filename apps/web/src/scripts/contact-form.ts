import {
  normalizeContactInput,
  type ContactFieldErrors,
  type ContactInput,
} from '@portfolio/contracts';
import { DEFAULT_LOCALE, isLocale } from '../i18n/locales.ts';
import { contactMessages } from '../i18n/messages/contact.ts';
import { sendContactMessage } from '../lib/api/contact.ts';
import {
  CONTACT_FIELDS,
  fieldErrorMessage,
  fillTemplate,
  firstInvalidField,
  keepsRequestId,
  resolveRequestId,
  submitOutcome,
  validateContact,
  visibleErrors,
  type ContactField,
  type PendingRequest,
  type SubmitOutcome,
} from '../lib/contact-form.ts';
import { burstFrom } from './confetti.ts';
import { clearDraft, loadDraft, saveDraft } from './contact-draft.ts';

type Control = HTMLInputElement | HTMLTextAreaElement;
type Phase = 'idle' | 'sending' | 'sent';

interface FieldParts {
  control: Control;
  error: HTMLElement;
  count: HTMLElement | null;
  typing: HTMLElementTagNameMap['typing-field'] | null;
}

function isControl(element: Element | null): element is Control {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

function findField(root: ParentNode, name: ContactField): FieldParts | null {
  const field = root.querySelector(`[data-field="${name}"]`);
  const control = field?.querySelector('input, textarea') ?? null;
  const error = field?.querySelector('[data-error]');
  if (!field || !isControl(control) || !(error instanceof HTMLElement)) return null;
  const count = field.querySelector('[data-count]');
  return {
    control,
    error,
    count: count instanceof HTMLElement ? count : null,
    typing: field.querySelector('typing-field'),
  };
}

/**
 * The contact form: validation timing and messages follow the prototype, outcomes come from
 * `lib/contact-form.ts`. The element only wires the DOM; it holds no copy of its own.
 */
class ContactFormElement extends HTMLElement {
  #abort: AbortController | null = null;

  connectedCallback(): void {
    const form = this.querySelector('form');
    const submit = this.querySelector('[data-submit]');
    const status = this.querySelector('[data-status]');
    const again = this.querySelector('[data-again]');
    const trap = this.querySelector<HTMLInputElement>('input[name="website"]');
    const faces = this.querySelectorAll<HTMLElement>('[data-when]');
    const parts = {
      name: findField(this, 'name'),
      email: findField(this, 'email'),
      message: findField(this, 'message'),
    };
    if (
      !form ||
      !(submit instanceof HTMLButtonElement) ||
      !(status instanceof HTMLElement) ||
      !(again instanceof HTMLElement) ||
      !trap ||
      !parts.name ||
      !parts.email ||
      !parts.message
    ) {
      return;
    }
    const fields = { name: parts.name, email: parts.email, message: parts.message };

    this.#abort = new AbortController();
    const opts = { signal: this.#abort.signal };

    const locale = isLocale(this.dataset.locale) ? this.dataset.locale : DEFAULT_LOCALE;
    const copy = contactMessages(locale);

    let phase: Phase = 'idle';
    let tried = false;
    let touched: Record<ContactField, boolean> = { name: false, email: false, message: false };
    let serverErrors: ContactFieldErrors = {};
    let pending: PendingRequest | null = null;

    const values = (): ContactInput => ({
      name: fields.name.control.value,
      email: fields.email.control.value,
      message: fields.message.control.value,
    });

    const setStatus = (text: string, tone?: 'error') => {
      status.textContent = text;
      if (tone) status.dataset.tone = tone;
      else delete status.dataset.tone;
    };

    const updateCount = (name: ContactField) => {
      const { control, count } = fields[name];
      if (count) count.textContent = `${String(control.value.length)}/${String(control.maxLength)}`;
    };

    const renderErrors = () => {
      const shown = visibleErrors(validateContact(values()), serverErrors, { touched, tried });
      for (const name of CONTACT_FIELDS) {
        const { control, error } = fields[name];
        const codes = shown[name];
        const text = codes ? fieldErrorMessage(copy.errors[name], codes) : '';
        // Rewriting identical text would make the alert region announce it again.
        if (error.textContent !== text) error.textContent = text;
        if (text) control.setAttribute('aria-invalid', 'true');
        else control.removeAttribute('aria-invalid');
      }
    };

    const setPhase = (next: Phase) => {
      phase = next;
      for (const face of faces) face.hidden = face.dataset.when !== next;
      for (const name of CONTACT_FIELDS) fields[name].control.disabled = next !== 'idle';

      submit.disabled = next === 'sending';
      submit.toggleAttribute('data-busy', next === 'sending');
      submit.toggleAttribute('data-done', next === 'sent');
      if (next === 'sending') submit.setAttribute('aria-busy', 'true');
      else submit.removeAttribute('aria-busy');
      if (next === 'sent') submit.setAttribute('aria-disabled', 'true');
      else submit.removeAttribute('aria-disabled');
      // The sent button stays focusable but must never submit again.
      submit.type = next === 'sent' ? 'button' : 'submit';

      again.hidden = next !== 'sent';
      // A failure message stays through the retry: swapping it for "Sending…" would reflow the row.
      if (next !== 'sending' || status.dataset.tone !== 'error') {
        setStatus(next === 'sending' ? copy.form.statusSending : '');
      }
    };

    const apply = (outcome: SubmitOutcome, email: string) => {
      switch (outcome.kind) {
        case 'sent':
          setPhase('sent');
          clearDraft();
          setStatus(fillTemplate(copy.form.statusSent, { email }));
          // The disabled button dropped focus; keep keyboard users next to "Send another".
          submit.focus();
          burstFrom(submit);
          return;
        case 'fields': {
          serverErrors = outcome.fields;
          setPhase('idle');
          renderErrors();
          const first = firstInvalidField(outcome.fields);
          if (first) fields[first].control.focus();
          return;
        }
        case 'rate_limited':
        case 'failure':
          setPhase('idle');
          setStatus(
            outcome.kind === 'rate_limited' ? copy.form.rateLimited : copy.form.failure,
            'error',
          );
          submit.focus();
          return;
      }
    };

    const send = async () => {
      if (phase !== 'idle') return;
      tried = true;
      serverErrors = {};

      const invalid = firstInvalidField(validateContact(values()));
      renderErrors();
      if (invalid) {
        fields[invalid].control.focus();
        return;
      }

      const normalized = normalizeContactInput(values());
      pending = resolveRequestId(pending, normalized, () => crypto.randomUUID());
      setPhase('sending');
      const outcome = submitOutcome(
        await sendContactMessage({
          ...normalized,
          clientRequestId: pending.id,
          locale,
          website: trap.value,
        }),
      );
      if (!keepsRequestId(outcome)) pending = null;
      apply(outcome, normalized.email);
    };

    const reset = () => {
      tried = false;
      touched = { name: false, email: false, message: false };
      serverErrors = {};
      pending = null;
      setPhase('idle');
      for (const name of CONTACT_FIELDS) {
        // Clearing through the typing field keeps its decorative mirror and the counter in sync.
        fields[name].typing?.reset();
      }
      renderErrors();
      fields.name.control.focus();
    };

    const fieldOf = (target: EventTarget | null): ContactField | null =>
      CONTACT_FIELDS.find((name) => fields[name].control === target) ?? null;

    form.addEventListener(
      'input',
      (event) => {
        const name = fieldOf(event.target);
        if (!name) return;
        // An edited field is no longer what the server rejected.
        serverErrors = { ...serverErrors, [name]: undefined };
        updateCount(name);
        saveDraft(values());
        renderErrors();
      },
      opts,
    );
    form.addEventListener(
      'focusout',
      (event) => {
        const name = fieldOf(event.target);
        if (!name) return;
        // Not-yet-visited empty fields stay quiet until a submit attempt.
        if (fields[name].control.value.length > 0) touched[name] = true;
        renderErrors();
      },
      opts,
    );
    form.addEventListener(
      'keydown',
      (event) => {
        if (
          event.target === fields.message.control &&
          event.key === 'Enter' &&
          (event.ctrlKey || event.metaKey)
        ) {
          event.preventDefault();
          form.requestSubmit();
        }
      },
      opts,
    );
    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        void send();
      },
      opts,
    );
    again.addEventListener('click', reset, opts);

    // Only empty fields take the draft, so autofill and early typing win. The input event syncs the
    // typing mirror and counter; touched and tried stay false, so nothing validates yet.
    const draft = loadDraft();
    for (const name of CONTACT_FIELDS) {
      const { control } = fields[name];
      if (draft?.[name] && !control.value) {
        control.value = draft[name];
        control.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // Restored values (back/forward, autofill) can already be in the fields.
    updateCount('message');
    form.removeAttribute('inert');
  }

  disconnectedCallback(): void {
    this.#abort?.abort();
    this.#abort = null;
  }
}

if (!customElements.get('contact-form')) customElements.define('contact-form', ContactFormElement);
