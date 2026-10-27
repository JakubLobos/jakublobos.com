export interface OutgoingMail {
  readonly replyTo: string;
  readonly subject: string;
  readonly text: string;
}

export type MailFailureCode =
  'timeout' | 'network' | 'rate_limited' | 'provider_error' | 'rejected';

export type MailResult =
  { readonly ok: true } | { readonly ok: false; readonly code: MailFailureCode };

export interface Mailer {
  /** Never throws: every failure is a `MailResult`. `from` and `to` are fixed by configuration. */
  send(mail: OutgoingMail, opts: { readonly idempotencyKey: string }): Promise<MailResult>;
}
