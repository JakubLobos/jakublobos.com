import { defineMessages } from '../t.ts';

// PL is a draft pending owner review (D-02). The EN body is the owner's own text. Eyebrows are
// upper-cased here, not via CSS.
export const outsideMessages = defineMessages({
  en: {
    eyebrow: 'OUTSIDE OF WORK',
    title: 'Exploring the world',
    body: 'Outside of work, I love exploring new places, meeting people, and discovering different cultures. From the landscapes of Iceland to the streets of Japan, and the sunny shores of Madeira, Cyprus, and Tenerife, every destination has something unique to offer.',
    photosLabel: 'Travel photos',
  },
  pl: {
    eyebrow: 'POZA PRACĄ',
    title: 'Odkrywam świat',
    body: 'Poza pracą uwielbiam odkrywać nowe miejsca, poznawać ludzi i różne kultury. Od krajobrazów Islandii, przez ulice Japonii, po słoneczne wybrzeża Madery, Cypru i Teneryfy – każde miejsce ma w sobie coś wyjątkowego.',
    photosLabel: 'Zdjęcia z podróży',
  },
});
