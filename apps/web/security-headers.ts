/**
 * Single source of truth for the site's HTTP headers (docs/security.md §4, ADR-0012).
 * `integrations/cloudflare-headers.ts` writes them to `dist/_headers` for static assets;
 * `worker/` applies the same constants to its own responses, because `_headers` never
 * reaches Worker-generated responses.
 */

/**
 * The CSP header carries only non-fetch directives: fetch directives live in the hashed meta
 * policy Astro emits per page (a header copy would block those hashed inline resources).
 */
export const SITE_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy':
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

/** `/` varies by language negotiation, so shared caches must not store it. */
export const ROOT_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'private, no-cache',
  Vary: 'Accept-Language, Cookie',
};

/** `/set-language` sets a cookie on every call. */
export const SET_LANGUAGE_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'no-store',
};

export const HTML_CACHE_CONTROL = 'no-cache';

export interface CacheRule {
  /** Cloudflare `_headers` URL pattern. */
  readonly pattern: string;
  readonly cacheControl: string;
}

/**
 * Patterns must not overlap: Cloudflare joins same-named headers from every matching rule.
 * HTML pages are served at extensionless URLs (`/pl`), so the integration adds one
 * `HTML_CACHE_CONTROL` rule per built page on top of these.
 */
export const CACHE_RULES: readonly CacheRule[] = [
  { pattern: '/_astro/*', cacheControl: 'public, max-age=31536000, immutable' },
  { pattern: '/og/*', cacheControl: 'public, max-age=86400' },
  { pattern: '/resume/*', cacheControl: 'public, max-age=86400' },
];
