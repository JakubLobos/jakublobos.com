import { defineMessages } from '../t.ts';

export const seo = defineMessages({
  en: {
    // Alt text of the shared, English-only animated share image (T-095).
    og: {
      alt: 'Jakub Łobos: an animated card that turns from “Websites with personality.” into “Open to work!”',
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
      alt: 'Jakub Łobos: animowana karta, która zmienia hasło „Websites with personality.” na „Open to work!”',
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
