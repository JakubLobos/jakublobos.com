import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import cloudflareHeaders from './integrations/cloudflare-headers.ts';
import devShowcase from './integrations/dev-showcase.ts';

// PUBLIC_* variables live in the repo-root .env (shared with the API); `vite.envDir` below gives
// client code the same file. Only `.env` is read here, not `.env.<mode>`, so `site` and the CSP
// don't vary by mode; the real environment (CI, Cloudflare build) wins over the file.
const rootDir = fileURLToPath(new URL('../../', import.meta.url));

function loadPublicEnv(): Record<string, string | undefined> {
  const file = `${rootDir}.env`;
  const fromFile = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
  const merged = Object.entries({ ...fromFile, ...process.env }).filter(([key]) =>
    key.startsWith('PUBLIC_'),
  );
  // An empty value (e.g. PUBLIC_API_BASE_URL= in dev) means unset.
  return Object.fromEntries(merged.filter(([, value]) => value !== undefined && value !== ''));
}

const env = loadPublicEnv();
const siteUrl = env.PUBLIC_SITE_URL ?? 'http://localhost:4321';
const apiOrigin = env.PUBLIC_API_BASE_URL ? new URL(env.PUBLIC_API_BASE_URL).origin : null;

// Analytics origins are allowed only when the matching ID is set, so a build without analytics
// keeps the tight policy (ADR-0011; GA4 list per Google's tag CSP guide, no Ads features).
const ga4 = Boolean(env.PUBLIC_GA4_ID);
const posthogOrigin = env.PUBLIC_POSTHOG_KEY
  ? new URL(env.PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com').origin
  : null;
const sources = (...origins: (string | null)[]) =>
  origins.filter((origin) => origin !== null).join(' ');
const GA4_IMG = ['https://www.googletagmanager.com', 'https://*.google-analytics.com'];
const GA4_CONNECT = [...GA4_IMG, 'https://*.analytics.google.com'];

const provider = fontProviders.fontsource();
// Polish needs latin-ext (ą ć ę ł ń ó ś ź ż).
const subsets: ['latin', 'latin-ext'] = ['latin', 'latin-ext'];

export default defineConfig({
  site: siteUrl,
  output: 'static',
  build: { format: 'file' },
  trailingSlash: 'never',
  server: { port: 4321 },
  i18n: { locales: ['en', 'pl'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } },
  integrations: [
    devShowcase(),
    cloudflareHeaders(),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en-US', pl: 'pl-PL' } },
      filter: (page) => !page.endsWith('/404'),
    }),
  ],
  // Meta CSP with hashes (ADR-0012). Later tasks append their origins: T-030 Turnstile
  // (script-src, frame-src), T-032 analytics (script-src, img-src, connect-src).
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        `img-src ${sources("'self'", 'data:', ...(ga4 ? GA4_IMG : []))}`,
        "font-src 'self'",
        `connect-src ${sources("'self'", apiOrigin, ...(ga4 ? GA4_CONNECT : []), posthogOrigin)}`,
        "manifest-src 'self'",
        // Turnstile renders its challenge in an iframe (phone reveal, ADR-0015).
        'frame-src https://challenges.cloudflare.com',
      ],
      // Turnstile's script is loaded on demand when the visitor asks for the phone number; GA4's
      // gtag.js loads after consent.
      scriptDirective: {
        resources: [
          "'self'",
          'https://challenges.cloudflare.com',
          ...(ga4 ? ['https://www.googletagmanager.com'] : []),
        ],
      },
    },
  },
  fonts: [
    {
      name: 'Poppins',
      cssVariable: '--font-body',
      provider,
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets,
      fallbacks: ['sans-serif'],
    },
    {
      name: 'Ubuntu',
      cssVariable: '--font-ui',
      provider,
      weights: [500],
      styles: ['normal'],
      subsets,
      fallbacks: ['sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      provider,
      weights: [400],
      styles: ['normal'],
      subsets,
      fallbacks: ['monospace'],
    },
    {
      name: 'Rubik Doodle Shadow',
      cssVariable: '--font-display',
      provider,
      weights: [400],
      styles: ['normal'],
      subsets,
      fallbacks: ['cursive'],
    },
  ],
  vite: {
    envDir: rootDir,
    server: {
      proxy: { '/api': 'http://localhost:3000' },
    },
  },
});
