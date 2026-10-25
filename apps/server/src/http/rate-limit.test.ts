import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../domain/shared/clock.ts';
import { ALLOWED_ORIGIN, buildTestApp } from '../test-support/test-app.ts';
import { createGlobalCap } from './rate-limit.ts';

function post(app: Parameters<typeof request>[0], ip?: string) {
  const req = request(app).post('/api/echo').set('Origin', ALLOWED_ORIGIN).send({ a: 1 });
  return ip === undefined ? req : req.set('X-Real-IP', ip);
}

describe('createClientLimiter', () => {
  it('returns 429 with the envelope, Retry-After and draft-8 RateLimit headers', async () => {
    const { app } = buildTestApp({ limit: 2 });
    expect((await post(app)).status).toBe(200);
    expect((await post(app)).status).toBe(200);
    const limited = await post(app);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toMatchObject({ code: 'RATE_LIMITED' });
    expect(limited.body.error.requestId).toBe(limited.headers['x-request-id']);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(limited.headers.ratelimit).toBeDefined();
    expect(limited.headers['ratelimit-policy']).toBeDefined();
  });

  it('gives different X-Real-IP values separate buckets in x-real-ip mode', async () => {
    const { app } = buildTestApp({ limit: 1, clientIpSource: 'x-real-ip' });
    expect((await post(app, '203.0.113.1')).status).toBe(200);
    expect((await post(app, '203.0.113.1')).status).toBe(429);
    expect((await post(app, '203.0.113.2')).status).toBe(200);
  });

  it('shares one bucket per IPv6 /56 prefix', async () => {
    const { app } = buildTestApp({ limit: 1, clientIpSource: 'x-real-ip' });
    expect((await post(app, '2001:db8:0:1::1')).status).toBe(200);
    expect((await post(app, '2001:db8:0:1::2')).status).toBe(429);
    expect((await post(app, '2001:db8:0:ff::1')).status).toBe(429);
    expect((await post(app, '2001:db8:1:0::1')).status).toBe(200);
  });

  it('ignores X-Real-IP in socket mode (one shared bucket)', async () => {
    const { app } = buildTestApp({ limit: 1, clientIpSource: 'socket' });
    expect((await post(app, '203.0.113.1')).status).toBe(200);
    expect((await post(app, '203.0.113.2')).status).toBe(429);
  });
});

describe('createGlobalCap', () => {
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  it('enforces both windows and reports the longer wait', () => {
    const clock = new FakeClock(0);
    const cap = createGlobalCap({
      windows: [
        { windowMs: HOUR, limit: 2 },
        { windowMs: DAY, limit: 3 },
      ],
      clock,
    });
    expect(cap.consume()).toEqual({ ok: true });
    expect(cap.consume()).toEqual({ ok: true });
    // Hourly window is full.
    expect(cap.consume()).toEqual({ ok: false, retryAfterSeconds: 3600 });

    clock.set(HOUR);
    expect(cap.consume()).toEqual({ ok: true }); // third of the day
    // Daily window is now full even though the hourly one has room.
    const blocked = cap.consume();
    expect(blocked).toEqual({ ok: false, retryAfterSeconds: (DAY - HOUR) / 1000 });
  });

  it('does not count rejected attempts against the other window', () => {
    const clock = new FakeClock(0);
    const cap = createGlobalCap({
      windows: [
        { windowMs: 1000, limit: 1 },
        { windowMs: DAY, limit: 2 },
      ],
      clock,
    });
    expect(cap.consume().ok).toBe(true);
    expect(cap.consume().ok).toBe(false);
    expect(cap.consume().ok).toBe(false);
    clock.advance(1000);
    expect(cap.consume().ok).toBe(true); // daily count is 2, not 4
    clock.advance(1000);
    expect(cap.consume().ok).toBe(false);
  });
});
