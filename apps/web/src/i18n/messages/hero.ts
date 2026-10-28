import { defineMessages } from '../t.ts';

// The intro is one sentence assembled around its two emphasised phrases (inflected per language).
// The pieces carry their own spaces: a single-letter word that ends a piece ("w", "i") is
// followed by an explicit no-break space, because the Polish typography pass only binds words
// inside one string.
export const hero = defineMessages({
  en: {
    title: 'Engineering centered around the user',
    intro: {
      before: 'Specializing in ',
      build: 'web application development',
      join: ' and ',
      design: 'interface design',
      after: ' using modern web technologies.',
    },
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
    intro: {
      before: 'Specjalizuję się w ',
      build: 'tworzeniu aplikacji webowych',
      join: ' i ',
      design: 'projektowaniu interfejsów',
      after: ' z użyciem nowoczesnych technologii webowych.',
    },
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
