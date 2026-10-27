import { defineMessages } from '../t.ts';

// The intro is two lines assembled around the tech words, which are inflected per language
// (Polish "w figmie").
export const hero = defineMessages({
  en: {
    title: 'Engineering with the user relationship in mind',
    build: {
      before: 'I’m making web-apps mostly in',
      first: 'react',
      join: '&',
      second: 'typescript',
    },
    design: { before: 'Designing web-apps in', tool: 'figma' },
    contact: 'Reach me out',
    resume: 'Get my resume',
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
  },
});
