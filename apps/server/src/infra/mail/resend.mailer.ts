import type { Logger } from 'pino';
import { z } from 'zod';
import type { MailResult, Mailer } from '../../domain/contact/mailer.port.ts';

const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_TIMEOUT_MS = 10_000;

const SuccessBodySchema = z.object({ id: z.string() });
// Only the machine-readable error name is read; `message` can echo addresses, so it's ignored.
const ErrorBodySchema = z.object({ name: z.string() });

export interface ResendMailerOptions {
  readonly apiKey: string;
  readonly from: string;
  readonly to: string;
  readonly fetch: typeof fetch;
  readonly logger: Logger;
  readonly timeoutMs?: number;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

export function createResendMailer(options: ResendMailerOptions): Mailer {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async send(mail, opts): Promise<MailResult> {
      let response: Response;
      try {
        response = await options.fetch(RESEND_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': opts.idempotencyKey,
          },
          body: JSON.stringify({
            from: options.from,
            to: [options.to],
            reply_to: mail.replyTo,
            subject: mail.subject,
            text: mail.text,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        return { ok: false, code: isTimeout(error) ? 'timeout' : 'network' };
      }

      const body = await readJson(response);
      if (response.ok) {
        // A 2xx without an id isn't Resend's contract; treat it as a provider fault.
        return SuccessBodySchema.safeParse(body).success
          ? { ok: true }
          : { ok: false, code: 'provider_error' };
      }

      if (response.status === 429) return { ok: false, code: 'rate_limited' };
      const errorName = ErrorBodySchema.safeParse(body).data?.name;
      if (response.status === 409) {
        // The payload is deterministic per key, so a different-payload conflict can only mean
        // this exact submission was already delivered within the key's 24 h lifetime.
        if (errorName === 'invalid_idempotent_request') return { ok: true };
        // Same key still in flight (double submit): transient, the visitor can retry.
        options.logger.warn({ status: 409, errorName }, 'resend request already in progress');
        return { ok: false, code: 'provider_error' };
      }
      if (response.status >= 400 && response.status < 500) {
        // 4xx other than 429 means our request or credentials are wrong, not the visitor's.
        options.logger.error(
          { status: response.status, errorName },
          'resend rejected the request; check mail configuration',
        );
        return { ok: false, code: 'rejected' };
      }
      return { ok: false, code: 'provider_error' };
    },
  };
}
