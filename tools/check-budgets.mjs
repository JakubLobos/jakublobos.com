// Fails when the built home pages exceed the performance budgets (docs/testing.md section 6).
// No dependencies: it parses apps/web/dist/{index,pl}.html, follows the eagerly loaded scripts
// (including inline ones) and their static imports, and gzips what a first paint has to download.
//
// Usage: node tools/check-budgets.mjs [--dist apps/web/dist] [--quiet]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

const KB = 1024;
// Two: the display font ships as latin + latin-ext subsets and Astro preloads every variant of a local font.
const BUDGET = { js: 35 * KB, css: 25 * KB, lazy: 80 * KB, preloadedFonts: 2 };
const PAGES = ['index.html', 'pl.html'];
// Client code must never ship the validation library (docs/architecture.md section 3).
const ZOD_SIGNATURES = [/\bzod\b/i, /ZodError/, /\$ZodType/, /contracts\/schemas/];

const { values } = parseArgs({
  options: {
    dist: { type: 'string', default: 'apps/web/dist' },
    quiet: { type: 'boolean', default: false },
  },
});
const dist = resolve(values.dist);

const gzipSize = (text) => gzipSync(text, { level: 9 }).length;
const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`;
const hasZod = (text) => ZOD_SIGNATURES.some((pattern) => pattern.test(text));
const failures = [];

function readAsset(urlPath) {
  try {
    return readFileSync(join(dist, urlPath), 'utf8');
  } catch {
    return undefined;
  }
}

const STATIC_IMPORT = /(?:\bfrom|\bimport)\s*["'`]([./][^"'`]+\.js)["'`]/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["'`]([./][^"'`]+\.js)["'`]\s*\)/g;

function specifiers(source, pattern, importerDir) {
  return [...source.matchAll(pattern)].map(([, spec]) =>
    spec.startsWith('/') ? spec : posix.join(importerDir, spec),
  );
}

/** Adds a script and its static imports to `loaded` (url -> source) and its dynamic imports to `dynamic`. */
function follow(url, loaded, dynamic) {
  if (loaded.has(url)) return;
  const source = readAsset(url);
  if (source === undefined) {
    failures.push(`referenced script ${url} is missing from dist`);
    return;
  }
  loaded.set(url, source);
  const dir = posix.dirname(url);
  for (const dep of specifiers(source, STATIC_IMPORT, dir)) follow(dep, loaded, dynamic);
  for (const dep of specifiers(source, DYNAMIC_IMPORT, dir)) dynamic.add(dep);
}

const rows = [];
for (const page of PAGES) {
  const html = readFileSync(join(dist, page), 'utf8');
  const loaded = new Map();
  const dynamic = new Set();
  const css = [];
  let inlineJs = '';

  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type=["']application\/ld\+json["']/.test(attrs)) continue;
    const src = /\bsrc=["']([^"']+)["']/.exec(attrs)?.[1];
    if (src !== undefined) {
      follow(src, loaded, dynamic);
      continue;
    }
    inlineJs += body;
    for (const dep of specifiers(body, STATIC_IMPORT, '/_astro')) follow(dep, loaded, dynamic);
    for (const dep of specifiers(body, DYNAMIC_IMPORT, '/_astro')) dynamic.add(dep);
  }
  for (const [, href] of html.matchAll(
    /<link\b[^>]*\brel=["']modulepreload["'][^>]*\bhref=["']([^"']+)["']/g,
  )) {
    follow(href, loaded, dynamic);
  }
  for (const [, href] of html.matchAll(
    /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["']/g,
  )) {
    css.push(readAsset(href) ?? '');
  }
  for (const [, body] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) css.push(body);

  const fonts = [...html.matchAll(/<link\b[^>]*\brel=["']preload["'][^>]*\bas=["']font["']/g)]
    .length;
  const jsBytes = gzipSize(inlineJs + [...loaded.values()].join('\n'));
  const cssBytes = gzipSize(css.join('\n'));

  // A chunk that is imported lazily but also loaded eagerly defeats the lazy split.
  for (const url of dynamic) {
    if (loaded.has(url)) failures.push(`${page}: ${url} is imported lazily but loaded eagerly`);
  }
  // Everything the page can pull in after first paint: dynamic targets plus their static imports.
  const lazyLoaded = new Map();
  for (const url of dynamic) follow(url, lazyLoaded, new Set());
  const lazy = [...lazyLoaded].filter(([url]) => !loaded.has(url));
  const lazyBytes = lazy.reduce((sum, [, source]) => sum + gzipSize(source), 0);

  if (jsBytes > BUDGET.js)
    failures.push(`${page}: critical JS ${kb(jsBytes)} gzip > ${kb(BUDGET.js)}`);
  if (cssBytes > BUDGET.css) failures.push(`${page}: CSS ${kb(cssBytes)} gzip > ${kb(BUDGET.css)}`);
  if (lazyBytes > BUDGET.lazy) {
    failures.push(`${page}: lazy chunks ${kb(lazyBytes)} gzip > ${kb(BUDGET.lazy)}`);
  }
  if (fonts > BUDGET.preloadedFonts) {
    failures.push(`${page}: ${fonts} preloaded fonts, at most ${BUDGET.preloadedFonts}`);
  }
  rows.push({ page, jsBytes, cssBytes, lazyBytes, lazyChunks: lazy.length, fonts });
}

// Every client asset, not only the ones the two pages reference.
for (const name of readdirSync(dist, { recursive: true })) {
  const file = join(dist, name);
  if (!/\.(html|js|css)$/.test(name) || !statSync(file).isFile()) continue;
  if (hasZod(readFileSync(file, 'utf8'))) failures.push(`${name} contains a zod signature`);
}

if (!values.quiet) {
  for (const row of rows) {
    console.log(
      `${row.page.padEnd(10)} critical JS ${kb(row.jsBytes)} / ${kb(BUDGET.js)}, ` +
        `CSS ${kb(row.cssBytes)} / ${kb(BUDGET.css)}, ` +
        `lazy ${kb(row.lazyBytes)} / ${kb(BUDGET.lazy)} (${row.lazyChunks} chunks), ` +
        `preloaded fonts ${row.fonts} / ${BUDGET.preloadedFonts}`,
    );
  }
}
if (failures.length > 0) {
  console.error(`Budget check failed:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('Budgets OK.');
