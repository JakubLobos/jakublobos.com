import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../../logger.ts';
import { createLogCapture } from '../../test-support/test-app.ts';
import { loadConfig } from '../../config.ts';
import { createConsoleMailer } from './console.mailer.ts';
import { createMailer } from './index.ts';
import { createResendMailer } from './resend.mailer.ts';

function fixture(name: string): string {
  return readFileSync(new URL(`../../../test/fixtures/resend/${name}`, import.meta.url), 'utf8');
}

const MAIL = {
  replyTo: 'jane@example.com',
  subject: 'Portfolio contact: Łukasz Żółć',
  text: 'Name: Łukasz Żółć\n\nHello',
};

function setup(respond: (init: RequestInit) => Promise<Response>, timeoutMs?: number) {
  const calls: { url: string; init: RequestInit }[] = [];
  const capture = createLogCapture();
  const logger = createLogger({ level: 'info', destination: capture.stream });
  const fetchStub: typeof fetch = (input, init = {}) => {
    calls.push({ url: typeof input === 'string' ? input : 'non-string', init });
    return respond(init);
  };
  const mailer = createResendMailer({
    apiKey: 'test-key',
    from: 'Portfolio <contact@example.com>',
    to: 'owner@example.com',
    fetch: fetchStub,
    logger,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
  return { mailer, calls, logs: capture.text };
}

const json = (body: string, status: number) =>
  Promise.resolve(new Response(body, { status, headers: { 'Content-Type': 'application/json' } }));

describe('resend mailer', () => {
  it('posts the documented request and returns ok on 2xx', async () => {
    const { mailer, calls } = setup(() => json(fixture('send-ok.json'), 200));
    expect(await mailer.send(MAIL, { idempotencyKey: 'req-1' })).toEqual({ ok: true });

    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.url).toBe('https://api.resend.com/emails');
    expect(call?.init.method).toBe('POST');
    expect(call?.init.headers).toEqual({
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'req-1',
    });
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
    // Non-ASCII survives the JSON round trip; from/to come from config only.
    expect(JSON.parse(typeof call?.init.body === 'string' ? call.init.body : '')).toEqual({
      from: 'Portfolio <contact@example.com>',
      to: ['owner@example.com'],
      reply_to: 'jane@example.com',
      subject: 'Portfolio contact: Łukasz Żółć',
      text: 'Name: Łukasz Żółć\n\nHello',
    });
  });

  it.each([
    [429, 'rate_limited'],
    [500, 'provider_error'],
  ])('maps HTTP %i to %s', async (status, code) => {
    const { mailer } = setup(() => json('{}', status));
    expect(await mailer.send(MAIL, { idempotencyKey: 'k' })).toEqual({ ok: false, code });
  });

  it('treats 409 invalid_idempotent_request as already delivered', async () => {
    const { mailer, logs } = setup(() => json('{"name":"invalid_idempotent_request"}', 409));
    expect(await mailer.send(MAIL, { idempotencyKey: 'k' })).toEqual({ ok: true });
    expect(logs()).toBe('');
  });

  it('treats 409 concurrent_idempotent_requests as transient and logs a warning', async () => {
    const { mailer, logs } = setup(() => json('{"name":"concurrent_idempotent_requests"}', 409));
    expect(await mailer.send(MAIL, { idempotencyKey: 'k' })).toEqual({
      ok: false,
      code: 'provider_error',
    });
    expect(logs()).toContain('"level":40');
    expect(logs()).not.toContain('"level":50');
  });

  it('maps other 4xx to rejected and logs only the status and error name', async () => {
    const { mailer, logs } = setup(() => json(fixture('error-validation.json'), 422));
    expect(await mailer.send(MAIL, { idempotencyKey: 'k' })).toEqual({
      ok: false,
      code: 'rejected',
    });
    expect(logs()).toContain('validation_error');
    expect(logs()).not.toContain('Invalid `to` field');
    expect(logs()).not.toContain('test-key');
  });

  it('treats a 2xx without an id as a provider error', async () => {
    const { mailer } = setup(() => json('{"unexpected":true}', 200));
    expect(await mailer.send(MAIL, { idempotencyKey: 'k' })).toEqual({
      ok: false,
      code: 'provider_error',
    });
  });

  it('maps an abort to timeout using a real (short) AbortSignal.timeout', async () => {
    const { mailer } = setup(
      (init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const reason: unknown = init.signal?.reason;
            reject(reason instanceof Error ? reason : new Error('aborted'));
          });
        }),
      5,
    );
    expect(await mailer.send(MAIL, { idempotencyKey: 'k' })).toEqual({
      ok: false,
      code: 'timeout',
    });
  });

  it('maps a fetch TypeError to network', async () => {
    const { mailer } = setup(() => Promise.reject(new TypeError('fetch failed')));
    expect(await mailer.send(MAIL, { idempotencyKey: 'k' })).toEqual({
      ok: false,
      code: 'network',
    });
  });
});

describe('console mailer', () => {
  it('logs sizes only and succeeds', async () => {
    const capture = createLogCapture();
    const mailer = createConsoleMailer(
      createLogger({ level: 'info', destination: capture.stream }),
    );
    expect(await mailer.send(MAIL, { idempotencyKey: 'k' })).toEqual({ ok: true });
    const logged = capture.text();
    expect(logged).toContain('"subjectLength"');
    expect(logged).toContain('"textLength"');
    expect(logged).not.toContain('Łukasz');
    expect(logged).not.toContain('jane@example.com');
  });

  it('fails on the [fail] test hook', async () => {
    const mailer = createConsoleMailer(createLogger({ level: 'silent' }));
    expect(await mailer.send({ ...MAIL, text: 'please [fail]' }, { idempotencyKey: 'k' })).toEqual({
      ok: false,
      code: 'provider_error',
    });
  });
});

describe('createMailer', () => {
  const deps = { fetch, logger: createLogger({ level: 'silent' }) };

  it('selects the console mailer by default', async () => {
    const { mail } = loadConfig({});
    expect(await createMailer(mail, deps).send(MAIL, { idempotencyKey: 'k' })).toEqual({
      ok: true,
    });
  });

  it('builds a Resend mailer that sends with the configured sender and recipient', async () => {
    const { mail } = loadConfig({
      MAILER: 'resend',
      RESEND_API_KEY: 'key',
      MAIL_FROM: 'Portfolio <contact@example.com>',
      CONTACT_RECIPIENT_EMAIL: 'owner@example.com',
    });
    const bodies: unknown[] = [];
    const fetchStub: typeof fetch = (_input, init) => {
      bodies.push(typeof init?.body === 'string' ? JSON.parse(init.body) : undefined);
      return json(fixture('send-ok.json'), 200);
    };
    const mailer = createMailer(mail, { ...deps, fetch: fetchStub });
    expect(await mailer.send(MAIL, { idempotencyKey: 'k' })).toEqual({ ok: true });
    expect(bodies[0]).toMatchObject({
      from: 'Portfolio <contact@example.com>',
      to: ['owner@example.com'],
    });
  });
});
