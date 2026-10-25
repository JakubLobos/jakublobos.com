import { Router } from 'express';
import type { FieldErrorCode, GuestbookMessageDto } from '@portfolio/contracts';
import { GuestbookSubmitRequestSchema } from '@portfolio/contracts/schemas';
import type { GuestbookService } from '../../domain/guestbook/guestbook.service.ts';
import { systemClock, type Clock } from '../../domain/shared/clock.ts';
import type { ClientIpSource } from '../client-ip.ts';
import { jsonBody } from '../middleware/require-json.ts';
import { createClientLimiter, createGlobalCap, type GlobalCap } from '../rate-limit.ts';
import { fail, ok } from '../respond.ts';
import type { RouteModule } from '../route-module.ts';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Bounds archive displacement and paid review calls however many IPs an attacker has. */
export function createGuestbookCap(clock: Clock = systemClock): GlobalCap {
  return createGlobalCap({
    windows: [
      { windowMs: HOUR_MS, limit: 20 },
      { windowMs: DAY_MS, limit: 50 },
    ],
    clock,
  });
}

export interface GuestbookRoutesDeps {
  readonly service: GuestbookService;
  readonly clientIpSource: ClientIpSource;
}

export function createGuestbookRoutes(deps: GuestbookRoutesDeps): RouteModule {
  const readLimiter = createClientLimiter({
    windowMs: MINUTE_MS,
    limit: 60,
    clientIpSource: deps.clientIpSource,
  });
  const writeLimiters = [
    createClientLimiter({
      windowMs: 10 * MINUTE_MS,
      limit: 3,
      clientIpSource: deps.clientIpSource,
    }),
    createClientLimiter({ windowMs: DAY_MS, limit: 10, clientIpSource: deps.clientIpSource }),
  ];

  const router = Router();

  router.get('/guestbook/latest', readLimiter, (_req, res) => {
    const latest = deps.service.latest();
    const message: GuestbookMessageDto | null =
      latest === null
        ? null
        : {
            id: latest.publicId,
            body: latest.body,
            paint: latest.paint,
            publishedAt: new Date(latest.approvedAt).toISOString(),
          };
    // Always revalidate; Express derives the ETag from the body and answers 304 itself.
    res.setHeader('Cache-Control', 'no-cache');
    ok(res, { message });
  });

  router.post('/guestbook', ...writeLimiters, ...jsonBody('8kb'), (req, res) => {
    const parsed = GuestbookSubmitRequestSchema.safeParse(req.body);
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

    const outcome = deps.service.submit(parsed.data, { log: req.log });
    switch (outcome.kind) {
      case 'accepted':
        ok(res, { status: 'received' }, 202);
        return;
      case 'invalid':
        fail(res, {
          status: 422,
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          fields: outcome.fields,
        });
        return;
      case 'busy':
        req.log.warn({ event: 'busy' }, 'guestbook submissions at capacity');
        fail(res, {
          status: 503,
          code: 'GUESTBOOK_BUSY',
          message: 'Guestbook is busy',
          retryAfterSeconds: outcome.retryAfterSeconds,
        });
        return;
    }
  });

  return { mountPath: '/api', router };
}
