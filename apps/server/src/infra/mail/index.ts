import type { Logger } from 'pino';
import type { Config } from '../../config.ts';
import type { Mailer } from '../../domain/contact/mailer.port.ts';
import { createConsoleMailer } from './console.mailer.ts';
import { createResendMailer } from './resend.mailer.ts';

export interface MailerDeps {
  readonly fetch: typeof fetch;
  readonly logger: Logger;
}

export function createMailer(config: Config['mail'], deps: MailerDeps): Mailer {
  if (config.mailer === 'console') return createConsoleMailer(deps.logger);
  // loadConfig already guarantees these for `resend`; this narrows the types.
  if (!config.resendApiKey || !config.from || !config.recipient) {
    throw new Error('Resend mailer requires RESEND_API_KEY, MAIL_FROM and CONTACT_RECIPIENT_EMAIL');
  }
  return createResendMailer({
    apiKey: config.resendApiKey,
    from: config.from,
    to: config.recipient,
    fetch: deps.fetch,
    logger: deps.logger,
  });
}
