import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendContactMessage } from './contact.ts';

const fetchMock = vi.fn<typeof fetch>();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const body = {
  name: 'Jane Doe',
  email: 'jane@company.com',
  message: 'I would love to talk.',
  clientRequestId: '6f0d1c1e-7a0f-4b1e-9c47-6f3f6a0a2b11',
  locale: 'en',
  website: '',
} as const;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('sendContactMessage', () => {
  it('posts the payload as JSON and accepts the sent envelope', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { status: 'sent' } }));

    await expect(sendContactMessage(body)).resolves.toEqual({
      ok: true,
      data: { status: 'sent' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/contact',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    );
  });

  it('refuses a 200 that is not the sent envelope', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { status: 'queued' } }));
    await expect(sendContactMessage(body)).resolves.toEqual({ ok: false, kind: 'unexpected' });
  });
});
