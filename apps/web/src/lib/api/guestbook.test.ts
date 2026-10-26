import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLatestGuestbookMessage,
  isLatest,
  isSubmitted,
  LATEST_TIMEOUT_MS,
  submitGuestbookMessage,
} from './guestbook.ts';

const fetchMock = vi.fn<typeof fetch>();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const message = {
  id: '0b7a2c1e-0000-4000-8000-000000000000',
  body: 'Hi',
  paint: 'blue',
  publishedAt: '2026-10-25T12:00:00.000Z',
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('response guards', () => {
  it('accepts a message, null, and rejects malformed shapes', () => {
    expect(isLatest({ message })).toBe(true);
    expect(isLatest({ message: null })).toBe(true);
    expect(isLatest({})).toBe(false);
    expect(isLatest({ message: { ...message, paint: 'green' } })).toBe(false);
    expect(isLatest({ message: { ...message, body: 1 } })).toBe(false);
    expect(isLatest(null)).toBe(false);
  });

  it('accepts only the received status', () => {
    expect(isSubmitted({ status: 'received' })).toBe(true);
    expect(isSubmitted({ status: 'sent' })).toBe(false);
    expect(isSubmitted(undefined)).toBe(false);
  });
});

describe('getLatestGuestbookMessage', () => {
  it('returns the validated message', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { message } }));

    await expect(getLatestGuestbookMessage()).resolves.toEqual({ ok: true, data: { message } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example.test/api/guestbook/latest');
  });

  it('treats a body that fails the guard as unexpected', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { message: { body: 'x' } } }));

    await expect(getLatestGuestbookMessage()).resolves.toEqual({ ok: false, kind: 'unexpected' });
  });

  it('asks the client for the 8 second timeout instead of its default', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(json(200, { data: { message: null } }));

    await getLatestGuestbookMessage();

    expect(timeout).toHaveBeenCalledWith(LATEST_TIMEOUT_MS);
    timeout.mockRestore();
  });
});

describe('submitGuestbookMessage', () => {
  const body = {
    body: 'Hello',
    paint: 'yellow',
    clientRequestId: '5a1c9d4e-0000-4000-8000-000000000000',
    locale: 'en',
    website: '',
  } as const;

  it('posts the request as JSON and accepts a 202', async () => {
    fetchMock.mockResolvedValue(json(202, { data: { status: 'received' } }));

    await expect(submitGuestbookMessage(body)).resolves.toEqual({
      ok: true,
      data: { status: 'received' },
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.example.test/api/guestbook');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it('surfaces a 422 with its field codes', async () => {
    fetchMock.mockResolvedValue(
      json(422, { error: { code: 'VALIDATION_FAILED', fields: { body: ['too_long'] } } }),
    );

    await expect(submitGuestbookMessage(body)).resolves.toEqual({
      ok: false,
      kind: 'validation',
      fields: { body: ['too_long'] },
    });
  });
});
