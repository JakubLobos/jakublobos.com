import { readFileSync } from 'node:fs';
import { createAssets } from './assets.ts';
import { parseHeadersFile, patternToRegExp } from './headers-file.ts';

export interface Worker {
  fetch(
    request: Request,
    env: { ASSETS: { fetch(request: Request): Promise<Response> } },
  ): Promise<Response>;
}

export interface EdgeOptions {
  readonly distDir: string;
  readonly wranglerConfigPath: string;
  readonly worker: Worker;
}

interface AssetsConfig {
  readonly runWorkerFirst: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function field(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

/** wrangler.jsonc allows comments; strip them (string-aware) and read the assets block. */
export function readAssetsConfig(jsonc: string): AssetsConfig {
  const json = jsonc
    .replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '$1')
    .replace(/("(?:\\.|[^"\\])*")|,(?=\s*[}\]])/g, '$1');
  const config: unknown = JSON.parse(json);
  const assets = field(config, 'assets');
  if (!isRecord(assets)) throw new Error('wrangler.jsonc: missing "assets"');
  // The emulator implements exactly these two behaviours; refuse to guess at others.
  if (field(assets, 'html_handling') !== 'auto-trailing-slash') {
    throw new Error('wrangler.jsonc: emulator supports html_handling "auto-trailing-slash" only');
  }
  if (field(assets, 'not_found_handling') !== '404-page') {
    throw new Error('wrangler.jsonc: emulator supports not_found_handling "404-page" only');
  }
  const first = field(assets, 'run_worker_first');
  if (!Array.isArray(first) || !first.every((entry) => typeof entry === 'string')) {
    throw new Error('wrangler.jsonc: run_worker_first must be a list of patterns');
  }
  return { runWorkerFirst: first };
}

/** `run_worker_first` patterns: `*` globs, and a leading `!` excludes a path. */
function workerFirstMatcher(patterns: readonly string[]): (pathname: string) => boolean {
  const include = patterns.filter((p) => !p.startsWith('!')).map(patternToRegExp);
  const exclude = patterns.filter((p) => p.startsWith('!')).map((p) => patternToRegExp(p.slice(1)));
  return (pathname) =>
    include.some((re) => re.test(pathname)) && !exclude.some((re) => re.test(pathname));
}

function readHeadersFile(distDir: string): string {
  try {
    return readFileSync(`${distDir}/_headers`, 'utf8');
  } catch {
    throw new Error(
      `${distDir}/_headers not found; run "pnpm --filter @portfolio/web build" first`,
    );
  }
}

/** One request handler that routes like Cloudflare: Worker-first paths vs. static assets. */
export function createEdge({ distDir, wranglerConfigPath, worker }: EdgeOptions) {
  const { runWorkerFirst } = readAssetsConfig(readFileSync(wranglerConfigPath, 'utf8'));
  const isWorkerFirst = workerFirstMatcher(runWorkerFirst);
  const headersText = readHeadersFile(distDir);
  const assets = createAssets(distDir, parseHeadersFile(headersText));

  return (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    // `_headers` is applied inside the assets service only, never to Worker responses.
    return isWorkerFirst(pathname)
      ? worker.fetch(request, { ASSETS: assets })
      : assets.fetch(request);
  };
}
