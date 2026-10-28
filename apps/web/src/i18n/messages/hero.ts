import { defineMessages } from '../t.ts';

// The intro is two lines assembled around the tech words, which are inflected per language
// (Polish "w figmie").
export const hero = defineMessages({
  en: {
    title: 'Engineering centered around the user',
    build: {
      before: 'I’m making web-apps mostly in',
      first: 'react',
      join: '&',
      second: 'typescript',
    },
    design: { before: 'Designing web-apps in', tool: 'figma' },
    contact: 'Reach me out',
    resume: 'Get my resume',
    resumeStatus: {
      busy: 'Checking that you are human…',
      done: 'Resume downloaded.',
      failed: 'The resume could not be downloaded. Please try again.',
      rateLimited: 'Too many attempts. Please try again in a few minutes.',
      unavailable: 'The resume is unavailable right now. Please email me instead.',
    },
    resumeNoScript: 'Enable JavaScript to download my resume, or email',
  },
  pl: {
    title: 'Inżynieria z myślą o relacji z użytkownikiem',
    build: {
      before: 'Tworzę aplikacje webowe głównie w',
      first: 'react',
      join: 'i',
      second: 'typescript',
    },
    design: { before: 'Projektuję aplikacje webowe w', tool: 'figmie' },
    contact: 'Napisz do mnie',
    resume: 'Pobierz moje CV',
    resumeStatus: {
      busy: 'Sprawdzam, czy jesteś człowiekiem…',
      done: 'CV zostało pobrane.',
      failed: 'Nie udało się pobrać CV. Spróbuj ponownie.',
      rateLimited: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.',
      unavailable: 'CV jest chwilowo niedostępne. Napisz do mnie e-mailem.',
    },
    resumeNoScript: 'Włącz JavaScript, aby pobrać CV, albo napisz na adres',
  },
});
