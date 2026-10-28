import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { HumanVerifier } from '../domain/contact/human-verifier.port.ts';
import { resolveClientIp, type ClientIpSource } from './client-ip.ts';
import { jsonBody } from './middleware/require-json.ts';
import { createClientLimiter, createGlobalCap, type GlobalCap } from './rate-limit.ts';
import { fail } from './respond.ts';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export interface HumanGateOptions {
  readonly verifier: HumanVerifier;
  readonly clientIpSource: ClientIpSource;
  /** The Turnstile `action` the widget was rendered with. */
  readonly expectedAction: string;
  /** Injectable so tests can exhaust the daily cap without 300 requests. */
  readonly globalCap?: GlobalCap | undefined;
}

export interface HumanGate {
  /** Per-client limiters and the 4 KB JSON body parser; mount before the handler. */
  readonly middleware: ReturnType<typeof jsonBody>;
  /** The token from a valid body, or `undefined` after answering 422. */
  readToken(
    req: Request,
    res: Response,
    schema: z.ZodType<{ readonly turnstileToken: string }>,
  ): string | undefined;
  /** Consumes the global cap and checks the token. `false` means the response was already sent. */
  verify(req: Request, res: Response, token: string): Promise<boolean>;
}

export function verificationUnavailable(res: Response, retryAfterSeconds: number): void {
  fail(res, {
    status: 503,
    code: 'VERIFICATION_UNAVAILABLE',
    message: 'Verification is unavailable',
    retryAfterSeconds,
  });
}

/**
 * The shared front door of routes that hand out something scrapers want (the phone number, the
 * resume) behind a Turnstile check. Each route builds its own gate, so limiters and the daily cap
 * are never shared between routes.
 */
export function createHumanGate(options: HumanGateOptions): HumanGate {
  const globalCap =
    options.globalCap ?? createGlobalCap({ windows: [{ windowMs: DAY_MS, limit: 300 }] });
  const limiters = [
    createClientLimiter({
      windowMs: 10 * MINUTE_MS,
      limit: 5,
      clientIpSource: options.clientIpSource,
    }),
    createClientLimiter({ windowMs: DAY_MS, limit: 20, clientIpSource: options.clientIpSource }),
  ];

  return {
    middleware: [...limiters, ...jsonBody('4kb')],

    readToken(req, res, schema) {
      const body = schema.safeParse(req.body);
      if (body.success) return body.data.turnstileToken;
      fail(res, {
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        fields: { turnstileToken: ['invalid'] },
      });
      return undefined;
    },

    async verify(req, res, token) {
      const cap = globalCap.consume();
      if (!cap.ok) {
        verificationUnavailable(res, cap.retryAfterSeconds);
        return false;
      }

      const result = await options.verifier.verify(token, {
        remoteIp: resolveClientIp(req, options.clientIpSource),
        expectedAction: options.expectedAction,
      });
      if (result.kind === 'unavailable') {
        req.log.warn('human verification unavailable');
        verificationUnavailable(res, 30);
        return false;
      }
      if (result.kind === 'rejected') {
        req.log.info({ reason: result.reason }, 'human verification rejected');
        fail(res, { status: 403, code: 'VERIFICATION_FAILED', message: 'Verification failed' });
        return false;
      }
      return true;
    },
  };
}
