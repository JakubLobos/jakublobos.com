import { DEFAULT_LOCALE, LOCALES, type Locale } from '@portfolio/contracts';

export { DEFAULT_LOCALE, LOCALES, type Locale };

const HTML_LANG: Record<Locale, string> = { en: 'en', pl: 'pl' };
const OG_LOCALE: Record<Locale, string> = { en: 'en_US', pl: 'pl_PL' };

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

/** Pages are static, so the locale comes from the route Astro matched, not from the request. */
export function localeFromAstro(astro: { currentLocale: string | undefined }): Locale {
  return isLocale(astro.currentLocale) ? astro.currentLocale : DEFAULT_LOCALE;
}

/**
 * Maps a locale-neutral page path ('/', '/privacy', '/404') to its URL path in `locale`:
 * English is unprefixed, other locales live under `/<locale>`.
 */
export function alternatePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

export function htmlLang(locale: Locale): string {
  return HTML_LANG[locale];
}

export function ogLocale(locale: Locale): string {
  return OG_LOCALE[locale];
}
