import { GuestbookLatestResponseSchema } from '@portfolio/contracts/schemas';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ALLOWED_ORIGIN } from '../../test-support/test-app.ts';
import { buildGuestbookTestApp, submission } from '../../../test/helpers/build-test-app.ts';

/** Each request comes from its own address so the per-client limits stay out of the way. */
function setup() {
  const app = buildGuestbookTestApp({ clientIpSource: 'x-real-ip' });
  let next = 0;
  const fresh = (body: unknown) => {
    next += 1;
    return app.post(body, `198.51.100.${String(next)}`);
  };
  return { ...app, fresh };
}

describe('POST /api/guestbook', () => {
  it('AC-6: accepted, duplicate, honeypot, quality-drop and blocked-term answers are byte-identical', async () => {
    const { fresh, repo } = setup();
    const first = submission({ body: 'Lovely portfolio, nice work' });
    const responses = [
      await fresh(first),
      await fresh(first), // same clientRequestId
      await fresh(submission({ body: 'LOVELY portfolio, nice work!' })), // same text, new id
      await fresh(submission({ website: 'http://spam.example' })),
      await fresh(submission({ body: 'loooooooool nice site' })),
      await fresh(submission({ body: 'buy crypto now' })),
    ];
    for (const res of responses) expect(res.status).toBe(202);
    expect(new Set(responses.map((res) => res.text))).toEqual(
      new Set(['{"data":{"status":"received"}}']),
    );
    expect(repo.listArchive({ limit: 10 })).toHaveLength(1);
  });

  it('answers 422 with field codes for rule failures and malformed shapes', async () => {
    const { fresh, repo } = setup();
    const link = await fresh(submission({ body: 'visit www.example.com' }));
    expect(link.status).toBe(422);
    expect(link.body.error).toMatchObject({
      code: 'VALIDATION_FAILED',
      fields: { body: ['links_not_allowed'] },
    });

    const shape = await fresh(submission({ paint: 'green', clientRequestId: 'nope' }));
    expect(shape.status).toBe(422);
    expect(shape.body.error.fields).toEqual({ paint: ['invalid'], clientRequestId: ['invalid'] });
    expect(repo.listArchive({ limit: 10 })).toHaveLength(0);
  });

  it('enforces the body limit and the JSON content type', async () => {
    const { app } = setup();
    const big = await request(app)
      .post('/api/guestbook')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ ...submission(), body: 'x'.repeat(9000) });
    expect(big.status).toBe(413);
    const text = await request(app)
      .post('/api/guestbook')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Content-Type', 'text/plain')
      .send('hello');
    expect(text.status).toBe(415);
  });

  it('limits a client to 3 requests per 10 minutes, counting invalid ones', async () => {
    const { post } = setup();
    const ip = '203.0.113.9';
    for (let i = 0; i < 3; i += 1) {
      expect((await post(submission({ body: 'see www.example.com' }), ip)).status).toBe(422);
    }
    const blocked = await post(submission(), ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('answers 503 GUESTBOOK_BUSY with Retry-After once the hourly cap is spent', async () => {
    const { fresh, clock } = setup();
    for (let i = 0; i < 20; i += 1) expect((await fresh(submission())).status).toBe(202);
    const busy = await fresh(submission());
    expect(busy.status).toBe(503);
    expect(busy.body.error.code).toBe('GUESTBOOK_BUSY');
    expect(busy.headers['retry-after']).toBe('3600');

    clock.advance(60 * 60 * 1000);
    expect((await fresh(submission())).status).toBe(202);
  });

  it('never logs the message text, an address, or the client request id', async () => {
    const app = setup();
    const secret = 'Zebra marmalade unicorn';
    const payload = submission({ body: secret });
    await app.post(payload, '203.0.113.77');
    await app.fresh(submission({ body: 'buy crypto now' }));
    await app.worker.tick();
    expect(app.repo.findLatestApproved()?.body).toBe(secret);

    const logs = app.logs();
    expect(logs).toContain('"event":"approved"');
    for (const sensitive of [secret, '203.0.113.77', payload.clientRequestId, 'crypto']) {
      expect(logs).not.toContain(sensitive);
    }
  });
});

describe('GET /api/guestbook/latest', () => {
  it('I-2 / AC-7: returns null, then the newest approved message, and never a pending one', async () => {
    const app = setup();
    const empty = await app.latest();
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ data: { message: null } });
    expect(empty.headers['cache-control']).toBe('no-cache');

    app.moderation.set({ kind: 'transient', code: 'timeout' });
    await app.fresh(submission({ body: 'Still waiting in review' }));
    await app.worker.tick();
    expect((await app.latest()).body).toEqual({ data: { message: null } });

    app.moderation.set({
      kind: 'ok',
      flagged: false,
      categories: {},
      scores: { harassment: 0 },
    });
    app.clock.advance(60_000);
    await app.worker.tick();
    const published = await app.latest();
    const parsed = GuestbookLatestResponseSchema.parse(published.body);
    expect(parsed.data.message).toMatchObject({
      body: 'Still waiting in review',
      paint: 'violet',
      publishedAt: new Date(app.clock.now()).toISOString(),
    });

    // A newer message still in review must not displace the published one.
    app.moderation.set({ kind: 'transient', code: 'timeout' });
    await app.fresh(submission({ body: 'A newer note under review' }));
    await app.worker.tick();
    expect((await app.latest()).body.data.message.body).toBe('Still waiting in review');
  });

  it('revalidates with ETag and answers 304 until the message changes', async () => {
    const app = setup();
    await app.fresh(submission({ body: 'First good note here' }));
    await app.worker.tick();
    const first = await app.latest();
    const etag = first.headers.etag;
    expect(typeof etag).toBe('string');

    expect((await app.latest(etag)).status).toBe(304);

    app.clock.advance(60_000);
    await app.fresh(submission({ body: 'Second good note here' }));
    await app.worker.tick();
    const changed = await app.latest(etag);
    expect(changed.status).toBe(200);
    expect(changed.body.data.message.body).toBe('Second good note here');
  });

  it('returns a stored XSS payload verbatim as data', async () => {
    const app = setup();
    const payload = '<img src=x onerror=alert(1)>';
    await app.fresh(submission({ body: payload }));
    await app.worker.tick();
    expect((await app.latest()).body.data.message.body).toBe(payload);
  });

  it('limits a client to 60 reads per minute', async () => {
    const { app } = setup();
    for (let i = 0; i < 60; i += 1) {
      expect(
        (await request(app).get('/api/guestbook/latest').set('X-Real-IP', '203.0.113.5')).status,
      ).toBe(200);
    }
    const limited = await request(app).get('/api/guestbook/latest').set('X-Real-IP', '203.0.113.5');
    expect(limited.status).toBe(429);
  });
});
