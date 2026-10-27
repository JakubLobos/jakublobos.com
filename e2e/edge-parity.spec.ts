import { expect, test, type APIResponse } from '@playwright/test';

// The Node edge emulator (apps/web/edge-emulator) stands in for Cloudflare locally because
// workerd crashes on some Windows hosts. These checks pin the assumptions it makes, so CI on
// Linux (E2E_EDGE=wrangler, real workerd) fails when the real runtime disagrees.
test.describe('@parity real workerd matches the edge emulator', () => {
  test.skip(process.env.E2E_EDGE !== 'wrangler', 'runs only against real `wrangler dev`');

  const noRedirects = { maxRedirects: 0 } as const;
  const header = (response: APIResponse, name: string): string | undefined =>
    response.headers()[name];

  test('_headers apply to asset responses', async ({ request }) => {
    const response = await request.get('/privacy', noRedirects);
    expect(response.status()).toBe(200);
    expect(header(response, 'x-frame-options')).toBe('DENY');
    expect(header(response, 'x-content-type-options')).toBe('nosniff');
    expect(header(response, 'cache-control')).toBe('no-cache');
  });

  test('/ is the Worker over ASSETS.fetch: asset body, Worker headers on top of _headers', async ({
    request,
  }) => {
    const response = await request.get('/', {
      ...noRedirects,
      headers: { 'Accept-Language': 'en' },
    });
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('lang="en"');
    expect(header(response, 'cache-control')).toBe('private, no-cache');
    expect(header(response, 'vary')).toContain('Accept-Language');
    expect(header(response, 'x-frame-options')).toBe('DENY');
  });

  test('/index.html redirects to / with a 307', async ({ request }) => {
    const response = await request.get('/index.html', noRedirects);
    expect(response.status()).toBe(307);
    expect(new URL(header(response, 'location') ?? '', 'http://x').pathname).toBe('/');
  });

  test('/privacy.html redirects to /privacy with a 307', async ({ request }) => {
    const response = await request.get('/privacy.html', noRedirects);
    expect(response.status()).toBe(307);
    expect(new URL(header(response, 'location') ?? '', 'http://x').pathname).toBe('/privacy');
    // Whether `_headers` reaches redirects is not relied on; the report keeps the answer.
    test.info().annotations.push({
      type: 'redirect headers',
      description: JSON.stringify(response.headers()),
    });
  });

  test('a missing page serves the nearest 404.html with _headers', async ({ request }) => {
    const polish = await request.get('/pl/nope', noRedirects);
    expect(polish.status()).toBe(404);
    expect(await polish.text()).toContain('lang="pl"');
    expect(header(polish, 'x-content-type-options')).toBe('nosniff');

    const english = await request.get('/nope', noRedirects);
    expect(english.status()).toBe(404);
    expect(await english.text()).toContain('lang="en"');
  });

  test('non-GET requests never get an asset', async ({ request }) => {
    const asset = await request.post('/privacy', noRedirects);
    expect(asset.status()).toBeGreaterThanOrEqual(400);
    test.info().annotations.push({ type: 'POST /privacy', description: String(asset.status()) });

    const root = await request.post('/', noRedirects);
    expect(root.status()).toBe(405);
    expect(header(root, 'allow')).toBe('GET, HEAD');
    expect(header(root, 'x-frame-options')).toBe('DENY');
  });
});
