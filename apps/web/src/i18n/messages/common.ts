import { defineMessages } from '../t.ts';

export const common = defineMessages({
  en: {
    siteName: 'Jakub Łobos',
    skipToContent: 'Skip to content',
    mainNavigation: 'Main',
    menu: 'Menu',
    socialLinks: 'Social links',
    // D-36: activating an email link copies the address.
    copyEmail: {
      tag: 'Copied!',
      announced: 'Email address copied',
      description: 'Copies the address',
    },
    // Accessible names for page sections (landmarks and nav items).
    sections: {
      hero: 'Introduction',
      marquee: 'Skills and about me',
      experience: 'Experience',
      projects: 'Projects',
      skills: 'Skills',
      guestbook: 'Guestbook',
      contact: 'Contact',
    },
  },
  pl: {
    siteName: 'Jakub Łobos',
    skipToContent: 'Przejdź do treści',
    mainNavigation: 'Główna',
    menu: 'Menu',
    socialLinks: 'Linki społecznościowe',
    copyEmail: {
      tag: 'Skopiowano!',
      announced: 'Adres e-mail skopiowany',
      description: 'Kopiuje adres',
    },
    sections: {
      hero: 'Wprowadzenie',
      marquee: 'Umiejętności i informacje o mnie',
      experience: 'Doświadczenie',
      projects: 'Projekty',
      skills: 'Umiejętności',
      guestbook: 'Księga gości',
      contact: 'Kontakt',
    },
  },
});
