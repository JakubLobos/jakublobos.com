import type { AstroIntegration } from 'astro';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  CACHE_RULES,
  HTML_CACHE_CONTROL,
  ROOT_HEADERS,
  SITE_SECURITY_HEADERS,
} from '../security-headers.ts';

// Cloudflare drops rules past these limits, silently weakening the policy, so fail the build instead.
const MAX_RULES = 100;
const MAX_LINE_LENGTH = 2000;

type Block = readonly [pattern: string, headers: Readonly<Record<string, string>>];

/** Built page paths from Astro (`''`, `pl/`, `privacy`, ...) as the URLs that serve them. */
function pageUrls(pagePaths: readonly string[]): string[] {
  return pagePaths.map((path) => `/${path.replace(/\/$/, '')}`);
}

export function renderHeadersFile(pagePaths: readonly string[]): string {
  const blocks: Block[] = [['/*', SITE_SECURITY_HEADERS]];
  for (const rule of CACHE_RULES)
    blocks.push([rule.pattern, { 'Cache-Control': rule.cacheControl }]);
  for (const url of pageUrls(pagePaths)) {
    // `/` is negotiated per request (private, Vary); it keeps the same values as the Worker's.
    blocks.push([url, url === '/' ? ROOT_HEADERS : { 'Cache-Control': HTML_CACHE_CONTROL }]);
  }
  if (blocks.length > MAX_RULES) {
    throw new Error(`_headers has ${blocks.length} rules; Cloudflare allows ${MAX_RULES}`);
  }
  const lines = blocks.flatMap(([pattern, headers]) => [
    pattern,
    ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`),
  ]);
  const tooLong = lines.find((line) => line.length > MAX_LINE_LENGTH);
  if (tooLong !== undefined) {
    throw new Error(`_headers line exceeds ${MAX_LINE_LENGTH} characters`);
  }
  return `${lines.join('\n')}\n`;
}

export default function cloudflareHeaders(): AstroIntegration {
  return {
    name: 'cloudflare-headers',
    hooks: {
      'astro:build:done': ({ dir, pages }) => {
        const file = renderHeadersFile(pages.map((page) => page.pathname));
        writeFileSync(fileURLToPath(new URL('_headers', dir)), file);
      },
    },
  };
}
