import { defineMessages } from '../t.ts';

// PL is a draft pending owner review (D-02). Eyebrows are upper-cased here, not via CSS.
export const notFound = defineMessages({
  en: {
    eyebrow: 'NOT FOUND',
    title: 'Oops — nothing here',
    text: 'The page you are looking for does not exist or has moved. Let’s get you back on track.',
    home: 'Take me home',
    projects: 'See my projects',
  },
  pl: {
    eyebrow: 'NIE ZNALEZIONO',
    title: 'Ups — nic tu nie ma',
    text: 'Strona, której szukasz, nie istnieje albo została przeniesiona. Wróćmy na właściwą drogę.',
    home: 'Wróć na stronę główną',
    projects: 'Zobacz moje projekty',
  },
});
