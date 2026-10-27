import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createHealthRoutes } from './http/routes/health.routes.ts';
import { ALLOWED_ORIGIN, buildTestApp, createProbeRoutes } from './test-support/test-app.ts';

describe('CORS', () => {
  it('answers an allowed preflight with 204, echoed origin, max-age and no credentials', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .options('/api/echo')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(res.headers['access-control-max-age']).toBe('600');
    expect(res.headers['access-control-allow-methods']).toBe('GET,POST,OPTIONS');
    expect(res.headers['access-control-allow-headers']).toBe('Content-Type,X-Request-Id');
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('emits no CORS headers for a foreign origin', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .options('/api/echo')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-max-age']).toBeUndefined();
    expect(res.headers['access-control-allow-methods']).toBeUndefined();
  });

  it('exposes the response headers the client needs on actual requests', async () => {
    const { app } = buildTestApp({
      routes: [createHealthRoutes({ checkDatabase: () => undefined })],
    });
    const res = await request(app).get('/api/health').set('Origin', ALLOWED_ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(res.headers['access-control-expose-headers']).toBe(
      'X-Request-Id,Retry-After,RateLimit,RateLimit-Policy',
    );
    expect(res.headers.vary).toContain('Origin');
  });

  it.each([
    ['a foreign Origin', 'https://evil.example'],
    ['no Origin', undefined],
  ])('rejects a POST with %s using 403 FORBIDDEN_ORIGIN', async (_name, origin) => {
    const { app } = buildTestApp();
    const req = request(app).post('/api/echo').send({ a: 1 });
    const res = await (origin === undefined ? req : req.set('Origin', origin));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatchObject({ code: 'FORBIDDEN_ORIGIN' });
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows GET without an Origin header (non-browser clients, health probes)', async () => {
    const { app } = buildTestApp({
      routes: [createHealthRoutes({ checkDatabase: () => undefined })],
    });
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});

describe('error envelopes', () => {
  const post = (app: Parameters<typeof request>[0]) =>
    request(app).post('/api/echo').set('Origin', ALLOWED_ORIGIN);

  it('200 success carries the data envelope', async () => {
    const { app } = buildTestApp();
    const res = await post(app).send({ a: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { received: true } });
  });

  it('400 INVALID_JSON for unparseable bodies', async () => {
    const { app } = buildTestApp();
    const res = await post(app).set('Content-Type', 'application/json').send('{"a":');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'INVALID_JSON' });
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('413 PAYLOAD_TOO_LARGE over the route limit', async () => {
    const { app } = buildTestApp();
    const res = await post(app).send({ text: 'x'.repeat(2000) });
    expect(res.status).toBe(413);
    expect(res.body.error).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });

  it('415 UNSUPPORTED_MEDIA_TYPE for non-JSON bodies', async () => {
    const { app } = buildTestApp();
    const res = await post(app).set('Content-Type', 'text/plain').send('hello');
    expect(res.status).toBe(415);
    expect(res.body.error).toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  });

  it('415 for an unsupported charset, logged as a warning without a stack', async () => {
    const { app, logs } = buildTestApp();
    const res = await post(app).set('Content-Type', 'application/json; charset=latin1').send('{}');
    expect(res.status).toBe(415);
    expect(res.body.error).toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
    expect(logs()).toContain('client error');
    expect(logs()).not.toContain('"level":50');
    expect(logs()).not.toContain('stack');
  });

  it('415 for an unsupported Content-Encoding', async () => {
    const { app } = buildTestApp();
    const res = await post(app)
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'compress')
      .send('{}');
    expect(res.status).toBe(415);
    expect(res.body.error).toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  });

  it('400 INVALID_JSON for a corrupt gzip body, not a 500', async () => {
    const { app, logs } = buildTestApp();
    const res = await post(app)
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .send(Buffer.from('this is not gzip data'));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'INVALID_JSON' });
    expect(logs()).not.toContain('"level":50');
  });

  it('404 NOT_FOUND for unknown routes', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('500 INTERNAL hides details and the stack', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(JSON.stringify(res.body)).not.toMatch(/kaboom|\.ts|at /);
  });

  it('treats a provider error that merely carries a 4xx status as a 500 at error level', async () => {
    const router = Router();
    router.get('/provider', () => {
      throw Object.assign(new Error('upstream auth failed'), { status: 401 });
    });
    const { app, logs } = buildTestApp({ routes: [{ mountPath: '/api', router }] });
    const res = await request(app).get('/api/provider');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(logs()).toContain('"level":50');
  });
});

describe('request id', () => {
  it('is set on every response, including 404 and preflight', async () => {
    const { app } = buildTestApp();
    const a = await request(app).get('/api/nope');
    const b = await request(app).options('/api/echo').set('Origin', ALLOWED_ORIGIN);
    expect(a.headers['x-request-id']).toBe('req-test-1');
    expect(b.headers['x-request-id']).toBe('req-test-2');
  });

  it('keeps a safe caller-supplied id and replaces an unsafe one', async () => {
    const { app } = buildTestApp();
    const safe = await request(app).get('/api/nope').set('X-Request-Id', 'client-abc-12345');
    expect(safe.headers['x-request-id']).toBe('client-abc-12345');
    const unsafe = await request(app).get('/api/nope').set('X-Request-Id', 'bad id with spaces');
    expect(unsafe.headers['x-request-id']).toBe('req-test-1');
  });
});

describe('security headers', () => {
  it('sets the API header set without x-powered-by or HSTS in development', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/nope');
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none'",
    );
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBeDefined();
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  it('adds HSTS only in production', async () => {
    const { app } = buildTestApp({ isProduction: true });
    const res = await request(app).get('/api/nope');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
  });
});

describe('health', () => {
  it('200 when the database check passes', async () => {
    const { app } = buildTestApp({
      routes: [createHealthRoutes({ checkDatabase: () => undefined })],
    });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok', db: 'ok' } });
  });

  it.each([
    [
      'throws',
      () => {
        throw new Error('db down');
      },
    ],
    ['rejects', () => Promise.reject(new Error('db down'))],
  ])('503 INTERNAL envelope when the database check %s', async (_name, checkDatabase) => {
    const { app } = buildTestApp({ routes: [createHealthRoutes({ checkDatabase })] });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.error).toMatchObject({ code: 'INTERNAL' });
    expect(res.headers['retry-after']).toBe('5');
    expect(JSON.stringify(res.body)).not.toContain('db down');
  });
});

describe('logging', () => {
  it('never logs bodies, IPs, cookies or authorization', async () => {
    const { app, logs } = buildTestApp({
      clientIpSource: 'x-real-ip',
      routes: [createProbeRoutes({ clientIpSource: 'x-real-ip' })],
    });
    await request(app)
      .post('/api/echo?token=query-secret')
      .set('Origin', ALLOWED_ORIGIN)
      .set('X-Real-IP', '203.0.113.99')
      .set('Cookie', 'session=cookie-secret')
      .set('Authorization', 'Bearer auth-secret')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com', body: 'private message text' });
    await request(app).get('/api/boom').set('X-Real-IP', '203.0.113.98');
    await request(app)
      .post('/api/echo')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Content-Type', 'application/json')
      .send('{"body":"broken private text"');

    const output = logs();
    expect(output).toContain('/api/echo');
    expect(output).toContain('req-test-1');
    expect(output).toContain('"statusCode":200');
    for (const forbidden of [
      'Ada Lovelace',
      'ada@example.com',
      'private message text',
      'broken private text',
      '203.0.113.99',
      '203.0.113.98',
      '127.0.0.1',
      '::1',
      'cookie-secret',
      'auth-secret',
      'query-secret',
    ]) {
      expect(output).not.toContain(forbidden);
    }
  });
});
