import type { Logger } from 'pino';
import type { Mailer } from '../../domain/contact/mailer.port.ts';

/** Development and test mailer. Logs sizes only; a `[fail]` marker simulates a provider outage. */
export function createConsoleMailer(logger: Logger): Mailer {
  return {
    send(mail) {
      logger.info(
        { subjectLength: mail.subject.length, textLength: mail.text.length },
        'console mailer: message not sent',
      );
      return Promise.resolve(
        mail.text.includes('[fail]') ? { ok: false, code: 'provider_error' } : { ok: true },
      );
    },
  };
}
