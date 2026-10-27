import { describe, expect, it } from 'vitest';
import { createSequentialIds } from '../../domain/shared/ids.ts';
import { createTurnstileVerifier } from './turnstile.verifier.ts';

// Cloudflare's documented always-pass test secret.
const TEST_SECRET = '1x0000000000000000000000000000000AA';
const CONTEXT = { remoteIp: '203.0.113.7', expectedAction: 'reveal-phone' };
const GOOD = { success: true, hostname: 'jakublobos.com', action: 'reveal-phone' };

function setup(respond: (init: RequestInit) => Promise<Response> | Response, timeoutMs?: number) {
  const requests: Record<string, unknown>[] = [];
  const ids = createSequentialIds('idem');
  const stubFetch: typeof fetch = async (_url, init) => {
    requests.push(
      JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as Record<string, unknown>,
    );
    return respond(init ?? {});
  };
  const verifier = createTurnstileVerifier({
    secret: TEST_SECRET,
    allowedHostnames: ['jakublobos.com', 'localhost'],
    fetch: stubFetch,
    nextIdempotencyKey: () => ids.next(),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
  return { verifier, requests };
}

describe('turnstile verifier', () => {
  it('verifies a matching response and sends secret, remoteip and a fresh idempotency_key', async () => {
    const { verifier, requests } = setup(() => Response.json(GOOD));
    expect(await verifier.verify('tok', CONTEXT)).toEqual({ kind: 'verified' });
    await verifier.verify('tok2', CONTEXT);
    expect(requests[0]).toEqual({
      secret: TEST_SECRET,
      response: 'tok',
      remoteip: '203.0.113.7',
      idempotency_key: 'idem-1',
    });
    expect(requests[1]?.idempotency_key).toBe('idem-2');
  });

  it.each([
    ['success false', { success: false, 'error-codes': ['invalid-input-response'] }],
    ['a replayed token', { success: false, 'error-codes': ['timeout-or-duplicate'] }],
    ['a foreign hostname', { ...GOOD, hostname: 'evil.example' }],
    ['a missing hostname', { success: true, action: 'reveal-phone' }],
    ['the wrong action', { ...GOOD, action: 'login' }],
  ])('rejects %s', async (_name, body) => {
    const { verifier } = setup(() => Response.json(body));
    expect((await verifier.verify('tok', CONTEXT)).kind).toBe('rejected');
  });

  it.each([
    ['a 5xx response', () => new Response('bad gateway', { status: 502 })],
    ['malformed JSON', () => new Response('not json', { status: 200 })],
    ['an unexpected shape', () => Response.json({ ok: 'yes' })],
    [
      'an invalid secret reported by Cloudflare',
      () => Response.json({ success: false, 'error-codes': ['invalid-input-secret'] }),
    ],
    ['a network error', () => Promise.reject(new TypeError('fetch failed'))],
  ])('is unavailable on %s', async (_name, respond) => {
    const { verifier } = setup(respond);
    expect(await verifier.verify('tok', CONTEXT)).toEqual({ kind: 'unavailable' });
  });

  it('is unavailable when the request exceeds the timeout', async () => {
    const { verifier } = setup(
      (init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'TimeoutError'));
          });
        }),
      5,
    );
    expect(await verifier.verify('tok', CONTEXT)).toEqual({ kind: 'unavailable' });
  });
});
