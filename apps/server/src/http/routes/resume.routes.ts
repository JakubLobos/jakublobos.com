import { Router } from 'express';
import { ResumeRequestSchema } from '@portfolio/contracts/schemas';
import type { HumanVerifier } from '../../domain/contact/human-verifier.port.ts';
import type { ResumeStore } from '../../domain/resume/resume-store.port.ts';
import { RESUME_DOWNLOAD_NAME } from '../../domain/resume/resume.ts';
import type { ClientIpSource } from '../client-ip.ts';
import { createHumanGate } from '../human-gate.ts';
import type { GlobalCap } from '../rate-limit.ts';
import { fail } from '../respond.ts';
import type { RouteModule } from '../route-module.ts';

export interface ResumeRoutesDeps {
  readonly verifier: HumanVerifier;
  readonly store: ResumeStore;
  readonly clientIpSource: ClientIpSource;
  /** Injectable so tests can exhaust the daily cap without 300 requests. */
  readonly globalCap?: GlobalCap;
}

/**
 * The resume PDF holds the owner's phone number, so it sits behind the same human check as the
 * phone reveal instead of being a static file (ADR-0018). The gate is a separate instance:
 * downloads must not eat the reveal budget.
 */
export function createResumeRoutes(deps: ResumeRoutesDeps): RouteModule {
  const gate = createHumanGate({
    verifier: deps.verifier,
    clientIpSource: deps.clientIpSource,
    expectedAction: 'download-resume',
    globalCap: deps.globalCap,
  });

  const router = Router();
  router.post('/resume', ...gate.middleware, async (req, res) => {
    const token = gate.readToken(req, res, ResumeRequestSchema);
    if (token === undefined) return;
    if (!(await gate.verify(req, res, token))) return;

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
