import { defineMessages } from '../t.ts';

// Section labels come from `common.sections`; the Menu label from `common.menu`.
export const nav = defineMessages({
  en: {
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    close: 'Close',
    mobileNavigation: 'Mobile',
    reachMe: 'Reach me out',
    social: { github: 'GitHub', linkedin: 'LinkedIn', email: 'Email' },
    language: 'Language',
    // Each language is named in itself: the switcher links carry it as their accessible name.
    languageName: { en: 'English', pl: 'Polski' },
  },
  pl: {
    openMenu: 'Otwórz menu',
    closeMenu: 'Zamknij menu',
    close: 'Zamknij',
    mobileNavigation: 'Mobilna',
    reachMe: 'Napisz do mnie',
    social: { github: 'GitHub', linkedin: 'LinkedIn', email: 'E-mail' },
    language: 'Język',
    languageName: { en: 'English', pl: 'Polski' },
  },
});
