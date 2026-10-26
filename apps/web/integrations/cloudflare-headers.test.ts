import { describe, expect, it } from 'vitest';
import { parseHeadersFile, headersForPath } from '../edge-emulator/headers-file.ts';
import { CACHE_RULES, ROOT_HEADERS, SITE_SECURITY_HEADERS } from '../security-headers.ts';
import worker from '../worker/index.ts';
import { renderHeadersFile } from './cloudflare-headers.ts';

const PAGES = ['', 'pl/', 'privacy', 'pl/privacy', '404', 'pl/404'];
const rules = parseHeadersFile(renderHeadersFile(PAGES));

describe('renderHeadersFile', () => {
  it('gives every security header to /* and the Worker emits the same set for /', async () => {
    const forAsset = headersForPath(rules, '/privacy');
    const response = await worker.fetch(new Request('https://jakublobos.com/'), {
      ASSETS: { fetch: () => Promise.resolve(new Response('')) },
    });
    for (const [name, value] of Object.entries(SITE_SECURITY_HEADERS)) {
      expect(forAsset.get(name), name).toBe(value);
      expect(response.headers.get(name), name).toBe(value);
    }
  });

  it('applies each cache rule exactly once, never joining overlapping rules', () => {
    for (const rule of CACHE_RULES) {
      const sample = rule.pattern.replace('*', 'x');
      expect(headersForPath(rules, sample).get('Cache-Control'), rule.pattern).toBe(
        rule.cacheControl,
      );
    }
    for (const page of ['/pl', '/privacy', '/pl/privacy']) {
      expect(headersForPath(rules, page).get('Cache-Control')).toBe('no-cache');
    }
  });

  it('marks / private with Vary, as the Worker does', () => {
    const root = headersForPath(rules, '/');
    for (const [name, value] of Object.entries(ROOT_HEADERS)) expect(root.get(name)).toBe(value);
  });

  it('stays within Cloudflare limits, failing the build otherwise', () => {
    expect(() => renderHeadersFile(Array.from({ length: 200 }, (_, i) => `p${i}`))).toThrow(
      /rules/,
    );
  });
});
