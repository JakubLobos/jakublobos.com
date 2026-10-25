import {
  DEFAULT_LOCALE,
  normalizeContactInput,
  validateContactInput,
  type ContactFieldErrors,
} from '@portfolio/contracts';
import type { MailFailureCode, Mailer, OutgoingMail } from './mailer.port.ts';

const SUBJECT_PREFIX = 'Portfolio contact: ';
const SUBJECT_MAX = 80;

export interface ContactSubmission {
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly clientRequestId: string;
  readonly locale?: string | undefined;
  readonly website?: string | undefined;
}

export type ContactOutcome =
  | { readonly kind: 'sent' }
  | {
      readonly kind: 'invalid';
      readonly fields: ContactFieldErrors;
    }
  | {
      readonly kind: 'unavailable';
      readonly reason: 'cap' | MailFailureCode;
      readonly retryAfterSeconds?: number;
    };

/** Structural match for the global caps built in the HTTP layer; keeps `domain/` free of it. */
export interface ContactCap {
  consume(): { readonly ok: true } | { readonly ok: false; readonly retryAfterSeconds: number };
}

export interface ContactService {
  send(submission: ContactSubmission): Promise<ContactOutcome>;
}

export interface ContactServiceDeps {
  readonly mailer: Mailer;
  readonly cap: ContactCap;
}

/** Names are validated already; this is defence in depth against header injection. */
function buildSubject(name: string): string {
  const safeName = name
    .replace(/[\p{Cc}\u2028\u2029]+/gu, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  return Array.from(`${SUBJECT_PREFIX}${safeName}`).slice(0, SUBJECT_MAX).join('');
}

// Deterministic in the submission: Resend rejects a reused Idempotency-Key whose payload
// differs, so nothing per-attempt (like a timestamp) may enter the mail. Its Date header
// already records when it was sent.
function buildMail(
  input: { name: string; email: string; message: string },
  locale: string,
): OutgoingMail {
  return {
    replyTo: input.email,
    subject: buildSubject(input.name),
    text: [
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Locale: ${locale}`,
      '',
      input.message,
    ].join('\n'),
  };
}

export function createContactService(deps: ContactServiceDeps): ContactService {
  return {
    async send(submission) {
      const normalized = normalizeContactInput(submission);
      const fields = validateContactInput(normalized);
      if (Object.keys(fields).length > 0) return { kind: 'invalid', fields };

      // Bots get the same answer as people, but nothing is sent and no budget is spent.
      if ((submission.website ?? '').trim() !== '') return { kind: 'sent' };

      const cap = deps.cap.consume();
      if (!cap.ok) {
        return { kind: 'unavailable', reason: 'cap', retryAfterSeconds: cap.retryAfterSeconds };
      }

      const mail = buildMail(normalized, submission.locale ?? DEFAULT_LOCALE);
      const result = await deps.mailer.send(mail, { idempotencyKey: submission.clientRequestId });
      return result.ok ? { kind: 'sent' } : { kind: 'unavailable', reason: result.code };
    },
  };
}
