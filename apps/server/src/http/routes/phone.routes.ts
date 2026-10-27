import { Router } from 'express';
import { PhoneRevealRequestSchema } from '@portfolio/contracts/schemas';
import type { HumanVerifier } from '../../domain/contact/human-verifier.port.ts';
import { formatPhone } from '../../domain/contact/phone.ts';
import { resolveClientIp, type ClientIpSource } from '../client-ip.ts';
import { jsonBody } from '../middleware/require-json.ts';
import { createClientLimiter, createGlobalCap, type GlobalCap } from '../rate-limit.ts';
import { fail, ok } from '../respond.ts';
import type { RouteModule } from '../route-module.ts';

const REVEAL_ACTION = 'reveal-phone';
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export interface PhoneRoutesDeps {
  readonly verifier: HumanVerifier;
  /** E.164 from `CONTACT_PHONE`; when unset the route answers 503 rather than inventing a number. */
  readonly phone: string | undefined;
  readonly clientIpSource: ClientIpSource;
  /** Injectable so tests can exhaust the daily cap without 300 requests. */
  readonly globalCap?: GlobalCap;
}

export function createPhoneRoutes(deps: PhoneRoutesDeps): RouteModule {
  const globalCap =
    deps.globalCap ?? createGlobalCap({ windows: [{ windowMs: DAY_MS, limit: 300 }] });
  const limiters = [
    createClientLimiter({
      windowMs: 10 * MINUTE_MS,
      limit: 5,
      clientIpSource: deps.clientIpSource,
    }),
    createClientLimiter({ windowMs: DAY_MS, limit: 20, clientIpSource: deps.clientIpSource }),
  ];

  const router = Router();
  router.post('/contact/phone', ...limiters, ...jsonBody('4kb'), async (req, res) => {
    const body = PhoneRevealRequestSchema.safeParse(req.body);
    if (!body.success) {
      fail(res, {
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        fields: { turnstileToken: ['invalid'] },
      });
      return;
    }

    const unavailable = (retryAfterSeconds: number) => {
      fail(res, {
        status: 503,
        code: 'VERIFICATION_UNAVAILABLE',
        message: 'Verification is unavailable',
        retryAfterSeconds,
      });
    };

    if (deps.phone === undefined) {
      req.log.error('contact phone is not configured');
      unavailable(300);
      return;
    }
    const cap = globalCap.consume();
    if (!cap.ok) {
      unavailable(cap.retryAfterSeconds);
      return;
    }

    const result = await deps.verifier.verify(body.data.turnstileToken, {
      remoteIp: resolveClientIp(req, deps.clientIpSource),
      expectedAction: REVEAL_ACTION,
    });
    if (result.kind === 'unavailable') {
      req.log.warn('human verification unavailable');
      unavailable(30);
      return;
    }
    if (result.kind === 'rejected') {
      req.log.info({ reason: result.reason }, 'human verification rejected');
      fail(res, { status: 403, code: 'VERIFICATION_FAILED', message: 'Verification failed' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    ok(res, formatPhone(deps.phone));
  });
  return { mountPath: '/api', router };
}
