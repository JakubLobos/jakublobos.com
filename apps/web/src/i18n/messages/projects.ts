import { defineMessages } from '../t.ts';

// PL is a draft pending owner review (D-02). Eyebrows are upper-cased here, not via CSS.
export const projectsMessages = defineMessages({
  en: {
    eyebrow: 'PROJECTS',
    title: 'I’m specializing in making web-apps',
    technologies: 'Technologies',
    links: 'Links',
    link: {
      website: 'Website',
      frontend: 'Frontend code',
      ui: 'UI library',
      source: 'Source code',
    },
  },
  pl: {
    eyebrow: 'PROJEKTY',
    title: 'Specjalizuję się w tworzeniu aplikacji webowych',
    technologies: 'Technologie',
    links: 'Linki',
    link: {
      website: 'Strona',
      frontend: 'Kod frontendu',
      ui: 'Biblioteka UI',
      source: 'Kod źródłowy',
    },
  },
});
