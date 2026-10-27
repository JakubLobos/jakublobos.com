import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEdge, readAssetsConfig } from './edge.ts';
import { headersForPath, parseHeadersFile, patternToRegExp } from './headers-file.ts';

const WRANGLER = `{
  // comments and "//" inside strings must survive
  "assets": {
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page",
    "run_worker_first": ["/", "/set-language"],
  }
}`;

const HEADERS = `# comment
/*
  X-Frame-Options: DENY
/_astro/*
  Cache-Control: public, immutable
/pl
  Cache-Control: no-cache
  X-Extra: b
/*
  X-Extra: a
`;

let dist: string;
let outside: string;
let edge: ReturnType<typeof createEdge>;
const get = (path: string, init?: RequestInit) =>
  edge(new Request(`http://localhost:8787${path}`, init));

function write(file: string, content: string): void {
  const target = join(dist, file);
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, content);
}

beforeAll(() => {
  const base = mkdtempSync(join(tmpdir(), 'edge-emulator-'));
  dist = join(base, 'dist');
  outside = join(base, 'secret.txt');
  writeFileSync(outside, 'secret');
  write('index.html', 'home');
  write('pl.html', 'polish');
  write('privacy.html', 'privacy');
  write('pl/privacy.html', 'pl-privacy');
  write('404.html', 'not-found');
  write('pl/404.html', 'pl-not-found');
  write('_astro/app.css', 'a{}');
  write('_astro/font.woff2', 'w');
  write('robots.txt', 'User-agent: *');
  write('_headers', HEADERS);
  writeFileSync(join(base, 'wrangler.jsonc'), WRANGLER);
  edge = createEdge({
    distDir: dist,
    wranglerConfigPath: join(base, 'wrangler.jsonc'),
    worker: {
      // A header only the Worker sets proves whether it ran.
      fetch: async (request, env) => {
        const upstream = await env.ASSETS.fetch(request);
        return new Response(`worker:${new URL(request.url).pathname}`, {
          status: upstream.status,
          headers: { 'X-Worker': '1' },
        });
      },
    },
  });
});

afterAll(() => {
  rmSync(join(dist, '..'), { recursive: true, force: true });
});

describe('routing (run_worker_first from wrangler.jsonc)', () => {
  it.each(['/', '/set-language?lang=pl'])('invokes the Worker for %s', async (path) => {
    expect((await get(path)).headers.get('X-Worker')).toBe('1');
  });

  it.each(['/pl', '/privacy', '/pl/privacy', '/_astro/app.css'])(
    'serves %s as an asset without invoking the Worker',
    async (path) => {
      const response = await get(path);
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Worker')).toBeNull();
    },
  );

  it('reads the real wrangler.jsonc', () => {
    const real = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
    expect(readAssetsConfig(real).runWorkerFirst).toEqual(['/', '/set-language']);
  });

  it('rejects a config the emulator does not implement', () => {
    expect(() =>
      readAssetsConfig(WRANGLER.replace('auto-trailing-slash', 'drop-trailing-slash')),
    ).toThrow(/html_handling/);
  });
});

describe('html handling (auto-trailing-slash)', () => {
  it.each([
    ['/pl', 'polish'],
    ['/privacy', 'privacy'],
    ['/pl/privacy', 'pl-privacy'],
  ])('serves %s from its .html file', async (path, body) => {
    const response = await get(path);
    expect(await response.text()).toBe(body);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
  });

  it.each([
    ['/pl/', '/pl'],
    ['/privacy/', '/privacy'],
    ['/privacy.html', '/privacy'],
    ['/pl.html?x=1', '/pl?x=1'],
    ['/index.html', '/'],
  ])('redirects %s to %s with 307', async (path, location) => {
    const response = await get(path);
    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe(location);
  });
});

describe('404 lookup', () => {
  it.each([
    ['/nope', 'not-found'],
    ['/pl/nope', 'pl-not-found'],
    ['/pl/deep/nope', 'pl-not-found'],
    ['/a/b/c', 'not-found'],
  ])('serves the nearest 404.html with status 404 for %s', async (path, body) => {
    const response = await get(path);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe(body);
  });
});

describe('content types', () => {
  it.each([
    ['/_astro/app.css', 'text/css; charset=utf-8'],
    ['/_astro/font.woff2', 'font/woff2'],
    ['/robots.txt', 'text/plain; charset=utf-8'],
  ])('%s -> %s', async (path, type) => {
    expect((await get(path)).headers.get('Content-Type')).toBe(type);
  });
});

describe('_headers', () => {
  it('applies matching rules to asset responses, joining repeated headers with ", "', async () => {
    const response = await get('/pl');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('X-Extra')).toBe('b, a');
  });

  it('does not apply to Worker responses', async () => {
    const response = await get('/');
    expect(response.headers.get('X-Frame-Options')).toBeNull();
  });

  it('matches splat patterns, placeholders and exact paths only', () => {
    const rules = parseHeadersFile(HEADERS);
    expect(headersForPath(rules, '/_astro/a/b.js').get('Cache-Control')).toBe('public, immutable');
    expect(headersForPath(rules, '/plx').get('Cache-Control')).toBeNull();
    expect(patternToRegExp('/blog/:slug').test('/blog/hello')).toBe(true);
    expect(patternToRegExp('/blog/:slug').test('/blog/a/b')).toBe(false);
    expect(patternToRegExp('/a.b').test('/aXb')).toBe(false);
  });

  it('rejects a malformed file', () => {
    expect(() => parseHeadersFile('  Orphan: header')).toThrow(/Invalid/);
  });
});

describe('path traversal', () => {
  it.each([
    '/../secret.txt',
    '/%2e%2e/secret.txt',
    '/..%2Fsecret.txt',
    '/%2E%2E%5Csecret.txt',
    '/a%00b',
  ])('returns 404 for %s', async (path) => {
    const response = await get(path);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toBe('secret');
  });
});
