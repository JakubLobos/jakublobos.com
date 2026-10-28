import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchResume } from './resume.ts';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('fetchResume', () => {
  it('posts the token and returns the PDF as a blob', async () => {
    fetchMock.mockResolvedValue(
      new Response('%PDF-1.4', { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
    );

    const result = await fetchResume('pass');

    expect(result.ok && (await result.data.text())).toBe('%PDF-1.4');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/resume',
      expect.objectContaining({ method: 'POST', body: '{"turnstileToken":"pass"}' }),
    );
  });

  it('refuses a 200 that is not a PDF', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
    );
    await expect(fetchResume('pass')).resolves.toEqual({ ok: false, kind: 'unexpected' });
  });

  it.each([
    [429, 'rate_limited'],
    [503, 'unavailable'],
    [403, 'unexpected'],
  ])('maps a %i to %s', async (status, kind) => {
    fetchMock.mockResolvedValue(new Response('{}', { status }));
    const result = await fetchResume('pass');
    expect(!result.ok && result.kind).toBe(kind);
  });
});
