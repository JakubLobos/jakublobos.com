import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isPhoneReveal, revealPhone } from './phone.ts';

const fetchMock = vi.fn<typeof fetch>();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('PUBLIC_API_BASE_URL', 'https://api.example.test');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('isPhoneReveal', () => {
  it('accepts a display string with an E.164 tel', () => {
    expect(isPhoneReveal({ display: '+48 000 000 000', tel: '+48000000000' })).toBe(true);
  });

  it.each([
    ['a tel without the plus', { display: '48 000', tel: '48000000000' }],
    ['a tel that is too short', { display: 'x', tel: '+1234567' }],
    ['a tel that is too long', { display: 'x', tel: '+1234567890123456' }],
    ['a tel carrying a URL scheme', { display: 'x', tel: 'javascript:alert(1)' }],
    ['a non-string tel', { display: 'x', tel: 48000000000 }],
    ['an empty display', { display: '', tel: '+48000000000' }],
    ['an oversized display', { display: 'x'.repeat(41), tel: '+48000000000' }],
    ['a missing display', { tel: '+48000000000' }],
    ['null', null],
  ])('rejects %s', (_label, value) => {
    expect(isPhoneReveal(value)).toBe(false);
  });
});

describe('revealPhone', () => {
  it('posts the token to the phone route and returns the validated number', async () => {
    fetchMock.mockResolvedValue(
      json(200, { data: { display: '+48 000 000 000', tel: '+48000000000' } }),
    );

    await expect(revealPhone('pass')).resolves.toEqual({
      ok: true,
      data: { display: '+48 000 000 000', tel: '+48000000000' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/contact/phone',
      expect.objectContaining({ method: 'POST', body: '{"turnstileToken":"pass"}' }),
    );
  });

  it('never yields a number for a malformed success', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { display: 'x', tel: 'tel:evil' } }));
    await expect(revealPhone('pass')).resolves.toEqual({ ok: false, kind: 'unexpected' });
  });
});
