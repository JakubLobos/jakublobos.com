import type { Locale } from '@portfolio/contracts';

// No phone number here: it is revealed only by the API after a bot check (ADR-0015).
export const profile = {
  name: 'Jakub Łobos',
  role: { en: 'Frontend Developer', pl: 'Frontend Developer' } satisfies Record<Locale, string>,
  email: 'jakubloboskontakt@gmail.com',
  github: { handle: 'JakubLobos', url: 'https://github.com/JakubLobos' },
  linkedin: { handle: 'JakubLobos', url: 'https://linkedin.com/in/JakubLobos' },
  /** BCP 47 codes of the languages spoken (structured data). */
  languageCodes: ['pl', 'en'],
  languages: {
    en: 'Polish (native), English (B2)',
    pl: 'polski (ojczysty), angielski (B2)',
  } satisfies Record<Locale, string>,
  // The owner adds the PDFs at the end of the project (D-10).
  resume: {
    en: '/resume/jakub-lobos-cv-en.pdf',
    pl: '/resume/jakub-lobos-cv-pl.pdf',
  } satisfies Record<Locale, string>,
} as const;
