import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUEST_TIMEOUT_MS, request, type Guard } from './client.ts';

interface Latest {
  message: string | null;
}

const isLatest: Guard<Latest> = (value): value is Latest =>
  typeof value === 'object' &&
  value !== null &&
  'message' in value &&
  (typeof value.message === 'string' || value.message === null);

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test/');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('request', () => {
  it('returns the validated envelope data and sends a credential-less JSON request', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { message: 'hi' } }));

    const result = await request('/api/x', { method: 'POST', body: { a: 1 } }, isLatest);

    expect(result).toEqual({ ok: true, data: { message: 'hi' } });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.example.test/api/x');
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'omit',
      body: '{"a":1}',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('omits Content-Type when there is no body', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { message: null } }));
    await request('/api/x', {}, isLatest);
    expect(fetchMock.mock.calls[0]![1]!.headers).not.toHaveProperty('Content-Type');
  });

  it('maps 422 to validation with the field codes, dropping unknown codes', async () => {
    fetchMock.mockResolvedValue(
      json(422, {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'x',
          fields: { body: ['links_not_allowed', 'bogus'], name: ['too_short'] },
        },
      }),
    );
    expect(await request('/api/x', {}, isLatest)).toEqual({
      ok: false,
      kind: 'validation',
      fields: { body: ['links_not_allowed'], name: ['too_short'] },
    });
  });

  it('treats a 422 without fields as unexpected', async () => {
    fetchMock.mockResolvedValue(json(422, { error: { code: 'VALIDATION_FAILED', message: 'x' } }));
    expect(await request('/api/x', {}, isLatest)).toEqual({ ok: false, kind: 'unexpected' });
  });

  it.each([
    ['30', 30],
    ['soon', null],
    [null, null],
  ])('maps 429 with Retry-After %j to %j', async (header, expected) => {
    fetchMock.mockResolvedValue(
      json(
        429,
        { error: { code: 'RATE_LIMITED', message: 'x' } },
        header ? { 'Retry-After': header } : {},
      ),
    );
    expect(await request('/api/x', {}, isLatest)).toEqual({
      ok: false,
      kind: 'rate_limited',
      retryAfterSeconds: expected,
    });
  });

  it('maps 503 to unavailable', async () => {
    fetchMock.mockResolvedValue(json(503, { error: { code: 'GUESTBOOK_BUSY', message: 'x' } }));
    expect(await request('/api/x', {}, isLatest)).toEqual({ ok: false, kind: 'unavailable' });
  });

  it('maps other failures (500, 403) to unexpected', async () => {
    fetchMock.mockResolvedValueOnce(json(500, { error: { code: 'INTERNAL', message: 'x' } }));
    fetchMock.mockResolvedValueOnce(
      json(403, { error: { code: 'FORBIDDEN_ORIGIN', message: 'x' } }),
    );
    expect(await request('/api/x', {}, isLatest)).toEqual({ ok: false, kind: 'unexpected' });
    expect(await request('/api/x', {}, isLatest)).toEqual({ ok: false, kind: 'unexpected' });
  });

  it('maps a rejected fetch to network without throwing', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await request('/api/x', {}, isLatest)).toEqual({ ok: false, kind: 'network' });
  });

  function hangUntilAborted(): void {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'TimeoutError'));
          });
        }),
    );
  }

  // AbortSignal.timeout runs on the runtime's own timers, which fake timers don't control.
  it('uses the default timeout when none is given', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(json(200, { data: { message: null } }));

    await request('/api/x', {}, isLatest);

    expect(timeout).toHaveBeenCalledWith(REQUEST_TIMEOUT_MS);
    timeout.mockRestore();
  });

  it('aborts after a per-call timeout and reports network', async () => {
    hangUntilAborted();

    expect(await request('/api/x', { timeoutMs: 20 }, isLatest)).toEqual({
      ok: false,
      kind: 'network',
    });
  });

  it('maps a non-JSON success body to unexpected', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 200 }));
    expect(await request('/api/x', {}, isLatest)).toEqual({ ok: false, kind: 'unexpected' });
  });

  it('maps a body that fails the guard to unexpected', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { message: 42 } }));
    expect(await request('/api/x', {}, isLatest)).toEqual({ ok: false, kind: 'unexpected' });
  });
});
