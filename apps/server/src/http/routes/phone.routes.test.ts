import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../domain/shared/clock.ts';
import { createFakeVerifier } from '../../infra/verification/fake.verifier.ts';
import { createTurnstileVerifier } from '../../infra/verification/turnstile.verifier.ts';
import { ALLOWED_ORIGIN, buildTestApp } from '../../test-support/test-app.ts';
import { createGlobalCap } from '../rate-limit.ts';
import { createPhoneRoutes, type PhoneRoutesDeps } from './phone.routes.ts';

const PHONE = '+48000000000';
const SECRET = '1x0000000000000000000000000000000AA';

function setup(overrides: Partial<PhoneRoutesDeps> = {}) {
  const built = buildTestApp({
    routes: [
      createPhoneRoutes({
        verifier: createFakeVerifier(),
        phone: PHONE,
        clientIpSource: 'socket',
        ...overrides,
      }),
    ],
  });
  const reveal = (token: unknown = 'pass') =>
    request(built.app)
      .post('/api/contact/phone')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ turnstileToken: token });
  return { ...built, reveal };
}

describe('POST /api/contact/phone', () => {
  it('returns the formatted number with no-store after a verified token', async () => {
    const { reveal } = setup();
    const res = await reveal('pass');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ data: { display: '+48 000 000 000', tel: PHONE } });
  });

  it('rejects an invalid token with 403 and never leaks the number', async () => {
    const { reveal } = setup();
    const res = await reveal('forged');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('VERIFICATION_FAILED');
    expect(JSON.stringify(res.body)).not.toContain('000');
  });

  it('answers 422 for a missing token without calling the verifier', async () => {
    const { reveal } = setup({
      verifier: { verify: () => Promise.reject(new Error('must not be called')) },
    });
    const res = await reveal('');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('answers 503 when the number is not configured', async () => {
    const { reveal } = setup({ phone: undefined });
    const res = await reveal('pass');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('VERIFICATION_UNAVAILABLE');
  });

  it('limits each client to 5 requests per 10 minutes', async () => {
    const { reveal } = setup();
    for (let i = 0; i < 5; i += 1) expect((await reveal('pass')).status).toBe(200);
    const res = await reveal('pass');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('answers 503 with Retry-After once the global cap is spent', async () => {
    const globalCap = createGlobalCap({
      windows: [{ windowMs: 86_400_000, limit: 1 }],
      clock: new FakeClock(0),
    });
    const { reveal } = setup({ globalCap });
    expect((await reveal('pass')).status).toBe(200);
    const res = await reveal('pass');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('VERIFICATION_UNAVAILABLE');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('answers 503 when Turnstile is down, and logs neither the secret, the number nor the IP', async () => {
    const verifier = createTurnstileVerifier({
      secret: SECRET,
      allowedHostnames: ['localhost'],
      fetch: () => Promise.resolve(new Response('down', { status: 503 })),
      nextIdempotencyKey: () => 'idem',
    });
    const { reveal, logs } = setup({ verifier });
    const res = await reveal('tok');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('VERIFICATION_UNAVAILABLE');

    const captured = logs();
    expect(captured).toContain('human verification unavailable');
    for (const secretValue of [SECRET, PHONE, '000 000', '127.0.0.1']) {
      expect(captured).not.toContain(secretValue);
    }
  });

  it('never logs the number or the client IP on success', async () => {
    const { reveal, logs } = setup();
    await reveal('pass');
    for (const secretValue of [PHONE, '000 000', '127.0.0.1']) {
      expect(logs()).not.toContain(secretValue);
    }
  });
});
