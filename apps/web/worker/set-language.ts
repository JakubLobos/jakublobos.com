import { DEFAULT_LOCALE, type Locale } from '@portfolio/contracts';
import { isLocale } from './negotiate-locale.ts';

/** Exact-match allowlist: anything else (off-site, protocol-relative, unknown) is never a target. */
const ALLOWED_TARGETS: ReadonlySet<string> = new Set(['/', '/pl', '/privacy', '/pl/privacy']);

const ONE_YEAR_SECONDS = 31_536_000;

export type SetLanguageResult =
  { readonly cookie: string; readonly location: string } | { readonly error: 400 };

function localeHome(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}`;
}

export function resolveSetLanguage(url: URL): SetLanguageResult {
  const lang = url.searchParams.get('lang');
  if (!isLocale(lang)) return { error: 400 };
  // searchParams has already percent-decoded `to`, so `%2F%2Fevil` is compared as `//evil`.
  const to = url.searchParams.get('to');
  return {
    cookie: `lang=${lang}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax; Secure; HttpOnly`,
    location: to !== null && ALLOWED_TARGETS.has(to) ? to : localeHome(lang),
  };
}
