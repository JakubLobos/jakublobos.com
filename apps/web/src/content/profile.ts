import type { Locale } from '@portfolio/contracts';

// No phone number here: it is revealed only by the API after a bot check (ADR-0015).
export const profile = {
  name: 'Jakub Łobos',
  role: { en: 'Software Engineer', pl: 'Software Engineer' } satisfies Record<Locale, string>,
  email: 'hello@jakublobos.com',
  github: { handle: 'JakubLobos', url: 'https://github.com/JakubLobos' },
  linkedin: { handle: 'jakubłobos', url: 'https://www.linkedin.com/in/jakub%C5%82obos/' },
  /** BCP 47 codes of the languages spoken (structured data). */
  languageCodes: ['pl', 'en'],
  languages: {
    en: 'Polish (native), English (B2)',
    pl: 'polski (ojczysty), angielski (B2)',
  } satisfies Record<Locale, string>,
} as const;
