import { Router } from 'express';
import { ResumeRequestSchema } from '@portfolio/contracts/schemas';
import type { HumanVerifier } from '../../domain/contact/human-verifier.port.ts';
import type { ResumeStore } from '../../domain/resume/resume-store.port.ts';
import { RESUME_DOWNLOAD_NAME } from '../../domain/resume/resume.ts';
import { resolveClientIp, type ClientIpSource } from '../client-ip.ts';
import { jsonBody } from '../middleware/require-json.ts';
import { createClientLimiter, createGlobalCap, type GlobalCap } from '../rate-limit.ts';
import { fail } from '../respond.ts';
import type { RouteModule } from '../route-module.ts';

const DOWNLOAD_ACTION = 'download-resume';
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export interface ResumeRoutesDeps {
  readonly verifier: HumanVerifier;
  readonly store: ResumeStore;
  readonly clientIpSource: ClientIpSource;
  /** Injectable so tests can exhaust the daily cap without 300 requests. */
  readonly globalCap?: GlobalCap;
}

/**
 * The resume PDF holds the owner's phone number, so it sits behind the same human check as the
 * phone reveal instead of being a static file (ADR-0018). Limits mirror the phone route but are
 * separate instances: downloads must not eat the reveal budget.
 */
export function createResumeRoutes(deps: ResumeRoutesDeps): RouteModule {
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
  router.post('/resume', ...limiters, ...jsonBody('4kb'), async (req, res) => {
    const body = ResumeRequestSchema.safeParse(req.body);
    if (!body.success) {
      fail(res, {
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        fields: { turnstileToken: ['invalid'] },
      });
      return;
    }

    const cap = globalCap.consume();
    if (!cap.ok) {
      fail(res, {
        status: 503,
        code: 'VERIFICATION_UNAVAILABLE',
        message: 'Verification is unavailable',
        retryAfterSeconds: cap.retryAfterSeconds,
      });
      return;
    }

    const verification = await deps.verifier.verify(body.data.turnstileToken, {
      remoteIp: resolveClientIp(req, deps.clientIpSource),
      expectedAction: DOWNLOAD_ACTION,
    });
    if (verification.kind === 'unavailable') {
      req.log.warn('human verification unavailable');
      fail(res, {
        status: 503,
        code: 'VERIFICATION_UNAVAILABLE',
        message: 'Verification is unavailable',
        retryAfterSeconds: 30,
      });
      return;
    }
    if (verification.kind === 'rejected') {
      req.log.info({ reason: verification.reason }, 'human verification rejected');
      fail(res, { status: 403, code: 'VERIFICATION_FAILED', message: 'Verification failed' });
      return;
    }

    const resume = await deps.store.read();
    if (resume.kind !== 'found') {
      // `invalid` is an upload mistake (wrong file), `missing` a forgotten upload; both need the owner.
      if (resume.kind === 'invalid') req.log.warn('resume file rejected: not an acceptable PDF');
      else req.log.error('resume file is not configured');
      fail(res, {
        status: 503,
        code: 'RESUME_UNAVAILABLE',
        message: 'The resume is unavailable',
        retryAfterSeconds: 300,
      });
      return;
    }

    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${RESUME_DOWNLOAD_NAME}"`,
        'Cache-Control': 'no-store',
      })
      .send(Buffer.from(resume.bytes));
  });
  return { mountPath: '/api', router };
}
