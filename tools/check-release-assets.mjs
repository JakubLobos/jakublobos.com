// Lists every release asset that is missing or wrong in the built site, then exits 1 if any are.
// Run after `astro build`; add --release for the production build (checks the public URLs).
//
// Usage: node tools/check-release-assets.mjs [--dist apps/web/dist] [--release]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    dist: { type: 'string', default: 'apps/web/dist' },
    release: { type: 'boolean', default: false },
  },
});
const dist = resolve(values.dist);

const SITE_URL = 'https://jakublobos.com';
const API_URL = 'https://api.jakublobos.com';
const OG_MAX_BYTES = 100 * 1024;
const problems = [];

function read(name) {
  try {
    return readFileSync(join(dist, name));
  } catch {
    return undefined;
  }
}

// Social images: 1200x630 PNGs under 100 KB (T-035).
for (const locale of ['en', 'pl']) {
  const name = `og/og-${locale}.png`;
  const png = read(name);
  if (png === undefined) {
    problems.push(`missing ${name}`);
    continue;
  }
  const isPng = png.subarray(1, 4).toString('latin1') === 'PNG';
  if (!isPng) problems.push(`${name} is not a PNG`);
  else if (png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) {
    problems.push(`${name} is ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}, expected 1200x630`);
  }
  if (png.length > OG_MAX_BYTES) problems.push(`${name} is ${png.length} bytes, over 100 KB`);
}

const sitemap = read('sitemap-0.xml');
if (read('sitemap-index.xml') === undefined || sitemap === undefined) {
  problems.push('missing sitemap-index.xml / sitemap-0.xml');
} else {
  const locations = [...sitemap.toString().matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
  for (const loc of locations) {
    if (/\/(__|404)/.test(new URL(loc).pathname)) problems.push(`sitemap lists ${loc}`);
  }
  if (values.release) {
    for (const loc of locations) {
      if (!loc.startsWith(`${SITE_URL}/`))
        problems.push(`sitemap URL ${loc} is not under ${SITE_URL}`);
    }
  }
}

const robots = read('robots.txt')?.toString();
if (robots === undefined) problems.push('missing robots.txt');
else {
  if (!/^Disallow:\s*\/set-language\s*$/m.test(robots))
    problems.push('robots.txt does not disallow /set-language');
  if (!/^Sitemap:\s*\S+sitemap-index\.xml\s*$/m.test(robots))
    problems.push('robots.txt does not reference the sitemap');
  if (values.release && !robots.includes(`Sitemap: ${SITE_URL}/`)) {
    problems.push(`robots.txt sitemap is not under ${SITE_URL}`);
  }
}

if (read('_headers') === undefined) problems.push('missing _headers');

if (values.release) {
  for (const [name, expected] of [
    ['PUBLIC_SITE_URL', SITE_URL],
    ['PUBLIC_API_BASE_URL', API_URL],
  ]) {
    if (process.env[name] !== expected) {
      problems.push(
        `${name} is ${JSON.stringify(process.env[name] ?? null)}, expected ${expected}`,
      );
    }
  }
  // The env only matters if it reached the build, so also look for the API origin in the client code.
  const scripts = readdirSync(join(dist, '_astro')).filter((n) => n.endsWith('.js'));
  const hasApi = scripts.some(
    (n) => statSync(join(dist, '_astro', n)).isFile() && read(`_astro/${n}`)?.includes(API_URL),
  );
  if (!hasApi)
    problems.push(`no client script contains ${API_URL}; rebuild with PUBLIC_API_BASE_URL set`);
}

if (problems.length > 0) {
  console.error(
    `Release assets: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`,
  );
  process.exit(1);
}
console.log('Release assets OK.');
