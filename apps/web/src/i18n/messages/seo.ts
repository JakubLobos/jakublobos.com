import { defineMessages } from '../t.ts';

export const seo = defineMessages({
  en: {
    // Share image (T-035): the text rendered into og-en.png and its alt text.
    og: {
      subtitle: 'Software Engineer · React & TypeScript',
      domain: 'jakublobos.com',
      alt: 'Jakub Łobos, Software Engineer: a hand-drawn mascot under the headline “Engineering with the user relationship in mind”',
    },
    home: {
      title: 'Jakub Łobos — Software Engineer Portfolio',
      description:
        'Portfolio of Jakub Łobos, a software engineer building web apps with React and TypeScript and designing them in Figma.',
    },
    privacy: {
      title: 'Privacy policy — Jakub Łobos',
      description:
        'How jakublobos.com handles your data: the guestbook, the contact form, cookies and analytics.',
    },
    notFound: {
      title: 'Page not found — Jakub Łobos',
      description: 'This page does not exist. Head back to the portfolio of Jakub Łobos.',
    },
  },
  pl: {
    og: {
      subtitle: 'Software Engineer · React i TypeScript',
      domain: 'jakublobos.com',
      alt: 'Jakub Łobos, Software Engineer: ręcznie rysowana maskotka pod hasłem „Inżynieria z myślą o relacji z użytkownikiem”',
    },
    home: {
      title: 'Jakub Łobos — portfolio Software Engineera',
      description:
        'Portfolio Jakuba Łobosa — Software Engineera, który tworzy aplikacje webowe w React i TypeScript i projektuje je w Figmie.',
    },
    privacy: {
      title: 'Polityka prywatności — Jakub Łobos',
      description:
        'Jak jakublobos.com przetwarza Twoje dane: księga gości, formularz kontaktowy, pliki cookie i analityka.',
    },
    notFound: {
      title: 'Nie znaleziono strony — Jakub Łobos',
      description: 'Ta strona nie istnieje. Wróć do portfolio Jakuba Łobosa.',
    },
  },
});

/** The pages that carry a title and description; `og` is the share image's own text. */
export type SeoKey = Exclude<keyof ReturnType<typeof seo>, 'og'>;
