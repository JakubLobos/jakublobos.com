import { describe, expect, it } from 'vitest';
import { ROOT_HEADERS, SITE_SECURITY_HEADERS } from '../security-headers.ts';
import worker, { type Env } from './index.ts';

const requested: string[] = [];
const env: Env = {
  ASSETS: {
    fetch: (request) => {
      requested.push(new URL(request.url).pathname);
      // Asset responses from the real binding have their own headers, which the Worker must override.
      return Promise.resolve(
        new Response('<html>english</html>', { headers: { 'Cache-Control': 'public, max-age=0' } }),
      );
    },
  },
};

const get = (path: string, headers: Record<string, string> = {}) =>
  worker.fetch(new Request(`https://jakublobos.com${path}`, { headers }), env);

function expectSecurityHeaders(response: Response) {
  for (const [name, value] of Object.entries(SITE_SECURITY_HEADERS)) {
    expect(response.headers.get(name), name).toBe(value);
  }
}

describe('GET /', () => {
  it('serves the English page when there is no preference', async () => {
    const response = await get('/');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<html>english</html>');
    expect(requested.at(-1)).toBe('/');
  });

  it.each([
    ['pl-PL,pl;q=0.9,en;q=0.8', undefined, 302],
    ['en-US,pl;q=0.5', undefined, 200],
    ['de,pl;q=0.5', undefined, 302],
    ['pl-PL,pl;q=0.9', 'lang=en', 200],
    ['en-US', 'lang=pl', 302],
  ])('Accept-Language %j with cookie %j -> %i', async (acceptLanguage, cookie, status) => {
    const response = await get('/', {
      'Accept-Language': acceptLanguage,
      ...(cookie ? { Cookie: cookie } : {}),
    });
    expect(response.status).toBe(status);
    if (status === 302) expect(response.headers.get('Location')).toBe('/pl');
  });

  it.each([
    ['English page', {}],
    ['redirect to /pl', { 'Accept-Language': 'pl' }],
  ])(
    'carries Vary, private no-cache and every security header on the %s',
    async (_name, headers) => {
      const response = await get('/', headers);
      expectSecurityHeaders(response);
      for (const [name, value] of Object.entries(ROOT_HEADERS)) {
        expect(response.headers.get(name), name).toBe(value);
      }
    },
  );

  it('rejects methods other than GET and HEAD', async () => {
    const response = await worker.fetch(
      new Request('https://jakublobos.com/', { method: 'POST' }),
      env,
    );
    expect(response.status).toBe(405);
    expectSecurityHeaders(response);
  });
});

describe('GET /set-language', () => {
  it('sets the cookie and redirects to an allowlisted path, uncached', async () => {
    const response = await get('/set-language?lang=pl&to=/pl/privacy');
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/pl/privacy');
    expect(response.headers.get('Set-Cookie')).toContain('lang=pl;');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expectSecurityHeaders(response);
  });

  it('falls back to the locale home for an off-site target', async () => {
    const response = await get('/set-language?lang=en&to=https://evil.example');
    expect(response.headers.get('Location')).toBe('/');
  });

  it('answers an invalid lang with 400 plain text and no cookie', async () => {
    const response = await get('/set-language?lang=de');
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(response.headers.get('Set-Cookie')).toBeNull();
    expectSecurityHeaders(response);
  });
});

it('passes any other path to the assets, still adding the security headers', async () => {
  const response = await get('/pl');
  expect(requested.at(-1)).toBe('/pl');
  expectSecurityHeaders(response);
});
