import type { MailResult, Mailer, OutgoingMail } from './mailer.port.ts';

export interface SentMail {
  readonly mail: OutgoingMail;
  readonly idempotencyKey: string;
}

/** Records calls and returns a scripted result; for tests. */
export function createFakeMailer(
  result: MailResult = { ok: true },
): Mailer & { readonly sent: SentMail[] } {
  const sent: SentMail[] = [];
  return {
    sent,
    send(mail, opts) {
      sent.push({ mail, idempotencyKey: opts.idempotencyKey });
      return Promise.resolve(result);
    },
  };
}
