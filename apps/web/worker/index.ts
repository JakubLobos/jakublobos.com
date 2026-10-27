import { ROOT_HEADERS, SET_LANGUAGE_HEADERS, SITE_SECURITY_HEADERS } from '../security-headers.ts';
import { negotiateLocale, readCookie } from './negotiate-locale.ts';
import { resolveSetLanguage } from './set-language.ts';

/** The one binding the Worker needs; kept structural so the code type-checks in Node and workerd. */
export interface Env {
  readonly ASSETS: { fetch(request: Request): Promise<Response> };
}

function withHeaders(response: Response, ...sets: Readonly<Record<string, string>>[]): Response {
  // Rebuilt rather than mutated: responses from ASSETS.fetch have immutable headers.
  const result = new Response(response.body, response);
  for (const headers of [SITE_SECURITY_HEADERS, ...sets]) {
    for (const [name, value] of Object.entries(headers)) result.headers.set(name, value);
  }
  return result;
}

function redirect(location: string, extra: Readonly<Record<string, string>>): Response {
  return withHeaders(new Response(null, { status: 302, headers: { Location: location } }), extra);
}

async function serveRoot(request: Request, env: Env): Promise<Response> {
  const locale = negotiateLocale({
    acceptLanguage: request.headers.get('Accept-Language'),
    cookieLang: readCookie(request.headers.get('Cookie'), 'lang'),
  });
  if (locale === 'pl') return redirect('/pl', ROOT_HEADERS);
  // `/`, not `/index.html`: with auto-trailing-slash the binding answers `/index.html` with a
  // redirect back to `/`, which would loop through this Worker.
  const english = await env.ASSETS.fetch(new Request(new URL('/', request.url), request));
  return withHeaders(english, ROOT_HEADERS);
}

function setLanguage(request: Request): Response {
  const result = resolveSetLanguage(new URL(request.url));
  if ('error' in result) {
    return withHeaders(
      new Response('Invalid language', {
        status: result.error,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
      SET_LANGUAGE_HEADERS,
    );
  }
  const response = redirect(result.location, SET_LANGUAGE_HEADERS);
  response.headers.append('Set-Cookie', result.cookie);
  return response;
}

export async function handle(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  // Only `/` and `/set-language` are routed here (run_worker_first); anything else is a fallback.
  if (pathname !== '/' && pathname !== '/set-language')
    return withHeaders(await env.ASSETS.fetch(request));
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return withHeaders(
      new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } }),
    );
  }
  return pathname === '/' ? serveRoot(request, env) : setLanguage(request);
}

export default { fetch: handle };
