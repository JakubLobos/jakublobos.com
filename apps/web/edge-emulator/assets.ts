import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { headersForPath, type HeaderRule } from './headers-file.ts';

export interface Assets {
  fetch(request: Request): Promise<Response>;
}

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function redirect(location: string): Response {
  return new Response(null, { status: 307, headers: { Location: location } });
}

/**
 * Serves `distDir` the way Cloudflare Workers static assets does with
 * `html_handling: "auto-trailing-slash"` and `not_found_handling: "404-page"`,
 * applying `_headers` rules to every asset response.
 */
export function createAssets(distDir: string, headerRules: readonly HeaderRule[]): Assets {
  const root = resolve(distDir);

  async function fileFor(urlPath: string): Promise<string | null> {
    const candidate = resolve(root, `.${urlPath}`);
    if (candidate !== root && !candidate.startsWith(root + sep)) return null;
    const info = await stat(candidate).catch(() => null);
    return info?.isFile() === true ? candidate : null;
  }

  async function respond(
    file: string,
    status: number,
    request: Request,
    headerPath: string,
  ): Promise<Response> {
    const body = new Uint8Array(await readFile(file));
    const headers = headersForPath(headerRules, headerPath);
    headers.set('Content-Type', CONTENT_TYPES[extname(file)] ?? 'application/octet-stream');
    headers.set('Content-Length', String(body.byteLength));
    return new Response(request.method === 'HEAD' ? null : body, { status, headers });
  }

  /** The nearest `404.html`, walking up from the missing path's directory. */
  async function notFound(request: Request, pathname: string): Promise<Response> {
    let directory = pathname.slice(0, pathname.lastIndexOf('/') + 1);
    for (;;) {
      const page = await fileFor(`${directory}404.html`);
      if (page !== null) return respond(page, 404, request, pathname);
      if (directory === '/') return new Response('Not Found', { status: 404 });
      directory = directory.slice(0, directory.lastIndexOf('/', directory.length - 2) + 1);
    }
  }

  async function fetchAsset(request: Request): Promise<Response> {
    const url = new URL(request.url);
    let path: string;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      return new Response('Not Found', { status: 404 });
    }
    // URL parsing resolves `..` literally; encoded separators only appear after decoding.
    if (path.includes('\0') || path.includes('\\') || path.split('/').includes('..')) {
      return new Response('Not Found', { status: 404 });
    }
    const to = (target: string): Response => redirect(target + url.search);

    if (path.endsWith('/index.html')) return to(path.slice(0, -'index.html'.length));
    if (path.endsWith('.html')) return to(path.slice(0, -'.html'.length));

    if (path.endsWith('/')) {
      const index = await fileFor(`${path}index.html`);
      if (index !== null) return respond(index, 200, request, url.pathname);
      // `/pl/` has no index but `pl.html` exists: file-format pages live without a trailing slash.
      if (path !== '/' && (await fileFor(`${path.slice(0, -1)}.html`)) !== null) {
        return to(path.slice(0, -1));
      }
      return notFound(request, path);
    }

    const exact = await fileFor(path);
    if (exact !== null) return respond(exact, 200, request, url.pathname);
    const page = await fileFor(`${path}.html`);
    if (page !== null) return respond(page, 200, request, url.pathname);
    if ((await fileFor(`${path}/index.html`)) !== null) return to(`${path}/`);
    return notFound(request, path);
  }

  return { fetch: fetchAsset };
}
