import { Router } from 'express';
import { PhoneRevealRequestSchema } from '@portfolio/contracts/schemas';
import type { HumanVerifier } from '../../domain/contact/human-verifier.port.ts';
import { formatPhone } from '../../domain/contact/phone.ts';
import type { ClientIpSource } from '../client-ip.ts';
import { createHumanGate, verificationUnavailable } from '../human-gate.ts';
import type { GlobalCap } from '../rate-limit.ts';
import { ok } from '../respond.ts';
import type { RouteModule } from '../route-module.ts';

export interface PhoneRoutesDeps {
  readonly verifier: HumanVerifier;
  /** E.164 from `CONTACT_PHONE`; when unset the route answers 503 rather than inventing a number. */
  readonly phone: string | undefined;
  readonly clientIpSource: ClientIpSource;
  /** Injectable so tests can exhaust the daily cap without 300 requests. */
  readonly globalCap?: GlobalCap;
}

export function createPhoneRoutes(deps: PhoneRoutesDeps): RouteModule {
  const gate = createHumanGate({
    verifier: deps.verifier,
    clientIpSource: deps.clientIpSource,
    expectedAction: 'reveal-phone',
    globalCap: deps.globalCap,
  });

  const router = Router();
  router.post('/contact/phone', ...gate.middleware, async (req, res) => {
    const token = gate.readToken(req, res, PhoneRevealRequestSchema);
    if (token === undefined) return;

    // Before the cap and the verifier, so a misconfigured deploy spends neither.
    if (deps.phone === undefined) {
      req.log.error('contact phone is not configured');
      verificationUnavailable(res, 300);
      return;
    }
    if (!(await gate.verify(req, res, token))) return;

    res.setHeader('Cache-Control', 'no-store');
    ok(res, formatPhone(deps.phone));
  });
  return { mountPath: '/api', router };
}
