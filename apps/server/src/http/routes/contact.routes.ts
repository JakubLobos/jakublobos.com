import { Router } from 'express';
import type { FieldErrorCode } from '@portfolio/contracts';
import { ContactRequestSchema } from '@portfolio/contracts/schemas';
import { createContactService } from '../../domain/contact/contact.service.ts';
import type { Mailer } from '../../domain/contact/mailer.port.ts';
import { systemClock, type Clock } from '../../domain/shared/clock.ts';
import type { ClientIpSource } from '../client-ip.ts';
import { jsonBody } from '../middleware/require-json.ts';
import { createClientLimiter, createGlobalCap } from '../rate-limit.ts';
import { fail, ok } from '../respond.ts';
import type { RouteModule } from '../route-module.ts';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
// Seconds a client should wait after a provider failure (no provider hint is trusted).
const PROVIDER_RETRY_AFTER_SECONDS = 30;

export interface ContactRoutesDeps {
  readonly mailer: Mailer;
  readonly clientIpSource: ClientIpSource;
  readonly clock?: Clock;
}

export function createContactRoutes(deps: ContactRoutesDeps): RouteModule {
  const clock = deps.clock ?? systemClock;
  const service = createContactService({
    mailer: deps.mailer,
    // Resend's free plan allows 100/day; stay well below it.
    cap: createGlobalCap({
      windows: [
        { windowMs: HOUR_MS, limit: 20 },
        { windowMs: DAY_MS, limit: 60 },
      ],
      clock,
    }),
  });

  const perClient = [
    createClientLimiter({
      windowMs: 10 * MINUTE_MS,
      limit: 3,
      clientIpSource: deps.clientIpSource,
    }),
    createClientLimiter({ windowMs: DAY_MS, limit: 10, clientIpSource: deps.clientIpSource }),
  ];

  const router = Router();
  router.post('/contact', ...perClient, ...jsonBody('16kb'), async (req, res) => {
    const parsed = ContactRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const received: unknown = req.body;
      const present = typeof received === 'object' && received !== null ? received : {};
      const fields: Record<string, FieldErrorCode[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field !== 'string') continue;
        if (issue.code === 'too_big') fields[field] = ['too_long'];
        else fields[field] = [field in present ? 'invalid' : 'required'];
      }
      fail(res, {
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        ...(Object.keys(fields).length > 0 ? { fields } : {}),
      });
      return;
    }

    const outcome = await service.send(parsed.data);
    switch (outcome.kind) {
      case 'sent':
        ok(res, { status: 'sent' });
        return;
      case 'invalid':
        fail(res, {
          status: 422,
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          fields: outcome.fields,
        });
        return;
      case 'unavailable':
        // Outcome only: the submission itself is never logged.
        req.log.warn({ reason: outcome.reason }, 'contact mail unavailable');
        fail(res, {
          status: 503,
          code: 'MAIL_UNAVAILABLE',
          message: 'Mail delivery is unavailable',
          retryAfterSeconds: outcome.retryAfterSeconds ?? PROVIDER_RETRY_AFTER_SECONDS,
        });
        return;
    }
  });
  return { mountPath: '/api', router };
}
