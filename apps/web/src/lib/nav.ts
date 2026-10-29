import { profile } from '../content/profile.ts';
import { alternatePath, type Locale } from '../i18n/locales.ts';

/** Page sections reachable from the navigation, in page order. */
export const NAV_SECTIONS = ['experience', 'projects', 'skills', 'guestbook', 'contact'] as const;

export type NavSection = (typeof NAV_SECTIONS)[number];

/** Off-site profiles open in a new tab, without handing the new page `window.opener`. */
export const EXTERNAL_LINK = { target: '_blank', rel: 'noopener noreferrer' } as const;

export const SOCIAL_LINKS = [
  { id: 'github', href: profile.github.url, external: true },
  { id: 'linkedin', href: profile.linkedin.url, external: true },
  { id: 'email', href: `mailto:${profile.email}`, external: false },
] as const;

/** Share of the viewport height above which a section counts as "reached" (design: 40 %). */
const REACHED_RATIO = 0.4;

/**
 * Target of a nav link: in-page on the home page, the localized home page elsewhere.
 * `path` is the locale-neutral page path; no `id` means the top of the page.
 */
export function navHref(locale: Locale, path: string, id?: NavSection): string {
  if (path === '/') return `#${id ?? 'top'}`;
  return `${alternatePath(locale, '/')}${id ? `#${id}` : ''}`;
}

/**
 * The current section is the last one (in `sections` order) whose top is above 40 % of the
 * viewport height; sections that are not on the page have a `null` top and are skipped.
 */
export function currentSection<T extends string>(
  sections: readonly { id: T; top: number | null }[],
  viewportHeight: number,
): T | null {
  let current: T | null = null;
  for (const { id, top } of sections) {
    if (top !== null && top < viewportHeight * REACHED_RATIO) current = id;
  }
  return current;
}
