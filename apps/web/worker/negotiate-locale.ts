import { DEFAULT_LOCALE, LOCALES, type Locale } from '@portfolio/contracts';

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

export interface NegotiationInput {
  readonly acceptLanguage: string | null;
  readonly cookieLang: string | null;
}

/** Reads one cookie from a `Cookie` request header; the value is untrusted. */
export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (cookieHeader === null) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator !== -1 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

/** The supported locale with the highest q-value; ties go to header order. */
function fromAcceptLanguage(header: string): Locale {
  let best: { locale: Locale; q: number } | null = null;
  for (const entry of header.split(',')) {
    const [range = '', ...params] = entry.split(';');
    const primary = range.trim().toLowerCase().split('-')[0];
    if (!isLocale(primary)) continue;
    const qParam = params.map((p) => p.trim()).find((p) => p.toLowerCase().startsWith('q='));
    const q = qParam === undefined ? 1 : Number(qParam.slice(2));
    // q=0 means "not acceptable"; a malformed q is ignored rather than trusted.
    if (!Number.isFinite(q) || q <= 0 || q > 1) continue;
    if (best === null || q > best.q) best = { locale: primary, q };
  }
  return best?.locale ?? DEFAULT_LOCALE;
}

/** Explicit `lang` cookie wins; otherwise `Accept-Language`; otherwise English. */
export function negotiateLocale({ acceptLanguage, cookieLang }: NegotiationInput): Locale {
  if (isLocale(cookieLang)) return cookieLang;
  return acceptLanguage === null ? DEFAULT_LOCALE : fromAcceptLanguage(acceptLanguage);
}
