import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createFakeMailer } from '../../domain/contact/fake-mailer.ts';
import type { MailResult } from '../../domain/contact/mailer.port.ts';
import { FakeClock, type Clock } from '../../domain/shared/clock.ts';
import { createResendMailer } from '../../infra/mail/resend.mailer.ts';
import { createLogger } from '../../logger.ts';
import { ALLOWED_ORIGIN, buildTestApp } from '../../test-support/test-app.ts';
import { createContactRoutes } from './contact.routes.ts';

const REQUEST_ID = '0b7f6d1e-5c0e-4a58-9d3a-3f0f3a1b2c4d';

const payload = (overrides: Record<string, unknown> = {}) => ({
  name: 'Łukasz Żółć',
  email: 'lukasz@example.com',
  message: 'Hello there, I like your portfolio.',
  clientRequestId: REQUEST_ID,
  locale: 'pl',
  website: '',
  ...overrides,
});

function setup(
  options: { result?: MailResult; source?: 'socket' | 'x-real-ip'; clock?: Clock } = {},
) {
  const mailer = createFakeMailer(options.result);
  const clientIpSource = options.source ?? 'socket';
  const built = buildTestApp({
    routes: [
      createContactRoutes({
        mailer,
        clientIpSource,
        ...(options.clock === undefined ? {} : { clock: options.clock }),
      }),
    ],
  });
  const post = (body: unknown, ip?: string) => {
    const req = request(built.app).post('/api/contact').set('Origin', ALLOWED_ORIGIN);
    return (ip === undefined ? req : req.set('X-Real-IP', ip)).send(body as object);
  };
  return { ...built, mailer, post };
}

describe('POST /api/contact', () => {
  it('sends and answers 200 with the documented body', async () => {
    const { post, mailer } = setup();
    const res = await post(payload());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'sent' } });
    expect(mailer.sent[0]?.idempotencyKey).toBe(REQUEST_ID);
    expect(mailer.sent[0]?.mail.replyTo).toBe('lukasz@example.com');
  });

  it('answers 422 with field codes and does not send', async () => {
    const { post, mailer } = setup();
    const res = await post(payload({ name: 'J', email: 'nope', message: 'short' }));
    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({
      code: 'VALIDATION_FAILED',
      fields: { name: ['too_short'], email: ['invalid'], message: ['too_short'] },
    });
    expect(mailer.sent).toHaveLength(0);
  });

  it('answers 422 for a malformed shape (missing id, wrong types)', async () => {
    const { post } = setup();
    const res = await post(payload({ clientRequestId: 'nope', name: 5 }));
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toEqual({ clientRequestId: ['invalid'], name: ['invalid'] });
  });

  it('reports a missing field as required and omits fields for a non-object body', async () => {
    const { post } = setup();
    const { email: _email, ...withoutEmail } = payload();
    const missing = await post(withoutEmail);
    expect(missing.status).toBe(422);
    expect(missing.body.error.fields).toEqual({ email: ['required'] });

    const array = await post([]);
    expect(array.status).toBe(422);
    expect(array.body.error.fields).toBeUndefined();
  });

  it('answers 200 for a filled honeypot without sending', async () => {
    const { post, mailer } = setup();
    const res = await post(payload({ website: 'https://spam.example' }));
    expect(res.status).toBe(200);
    expect(mailer.sent).toHaveLength(0);
  });

  it('enforces pipeline guards: 415, 413, and 403 for a foreign origin', async () => {
    const { app } = setup();
    const base = () => request(app).post('/api/contact').set('Origin', ALLOWED_ORIGIN);
    expect((await base().set('Content-Type', 'text/plain').send('x')).status).toBe(415);
    const big = await base().send({ ...payload(), message: 'x'.repeat(17_000) });
    expect(big.status).toBe(413);
    const foreign = await request(app)
      .post('/api/contact')
      .set('Origin', 'https://evil.example')
      .send(payload());
    expect(foreign.status).toBe(403);
  });

  it('limits a client to 3 requests per 10 minutes', async () => {
    const { post } = setup();
    for (let i = 0; i < 3; i += 1) expect((await post(payload())).status).toBe(200);
    const res = await post(payload());
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('caps accepted mail at 20 per hour across clients with 503 and Retry-After', async () => {
    const { post, mailer } = setup({ source: 'x-real-ip' });
    for (let i = 0; i < 20; i += 1) {
      expect((await post(payload(), `203.0.113.${String(i + 1)}`)).status).toBe(200);
    }
    const res = await post(payload(), '203.0.113.99');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MAIL_UNAVAILABLE');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(mailer.sent).toHaveLength(20);
  });

  it('caps accepted mail at 60 per day', async () => {
    const clock = new FakeClock(0);
    const { post, mailer } = setup({ source: 'x-real-ip', clock });
    let ip = 0;
    for (let hour = 0; hour < 3; hour += 1) {
      for (let i = 0; i < 20; i += 1) {
        ip += 1;
        expect((await post(payload(), `203.0.113.${String(ip)}`)).status).toBe(200);
      }
      clock.advance(60 * 60 * 1000);
    }
    const res = await post(payload(), '203.0.113.200');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MAIL_UNAVAILABLE');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(60 * 60);
    expect(mailer.sent).toHaveLength(60);
  });

  it('answers a retry of the same clientRequestId with 200 and an identical mail', async () => {
    const { post, mailer } = setup();
    expect((await post(payload())).status).toBe(200);
    expect((await post(payload())).status).toBe(200);
    expect(mailer.sent).toHaveLength(2);
    expect(mailer.sent[1]).toEqual(mailer.sent[0]);
  });

  it('never logs the name, email or message', async () => {
    const { post, logs } = setup({ result: { ok: false, code: 'provider_error' } });
    await post(payload());
    const text = logs();
    expect(text).toContain('contact mail unavailable');
    for (const secret of ['Łukasz', 'lukasz@example.com', 'I like your portfolio']) {
      expect(text).not.toContain(secret);
    }
  });
});

describe('POST /api/contact with the Resend mailer', () => {
  it('turns a provider failure into 503 MAIL_UNAVAILABLE with Retry-After', async () => {
    const mailer = createResendMailer({
      apiKey: 'test-key',
      from: 'Portfolio <contact@example.com>',
      to: 'owner@example.com',
      fetch: () => Promise.resolve(new Response('{}', { status: 500 })),
      logger: createLogger({ level: 'silent' }),
    });
    const { app } = buildTestApp({
      routes: [createContactRoutes({ mailer, clientIpSource: 'socket' })],
    });
    const res = await request(app)
      .post('/api/contact')
      .set('Origin', ALLOWED_ORIGIN)
      .send(payload());
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MAIL_UNAVAILABLE');
    expect(res.headers['retry-after']).toBeDefined();
  });
});
