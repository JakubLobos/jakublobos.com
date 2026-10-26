import type { Locale } from '@portfolio/contracts';
import { polishTypography } from '../lib/pl-typography.ts';

type Localized = Record<Locale, string>;

export interface Project {
  n: string;
  title: Localized;
  desc: Localized;
  org: string;
  /** Technology names are kept in English in every locale. */
  tags: readonly string[];
}

// PL texts are drafts pending owner review (D-02).
const rawProjects: readonly Project[] = [
  {
    n: '01',
    title: { en: 'Hosting control panel', pl: 'Panel zarządzania hostingiem' },
    desc: {
      en: 'Evolved core modules of the control panel and product site: server configuration, purchase/upgrade flow, in-browser file manager (WebFTP), web console, and gRPC-powered server process views',
      pl: 'Rozwijałem kluczowe moduły panelu zarządzania i strony produktowej: konfigurację serwera, proces zakupu i zmiany planu, menedżer plików w przeglądarce (WebFTP), konsolę webową oraz widoki procesów serwera oparte na gRPC.',
    },
    org: 'Vitresoft',
    tags: ['React', 'TypeScript', 'gRPC'],
  },
  {
    n: '02',
    title: { en: 'Item shop builder', pl: 'Kreator sklepów z przedmiotami' },
    desc: {
      en: 'Co-built from scratch, together with the backend team, an online store builder (item shops) for server administrators.',
      pl: 'Współtworzyłem od podstaw, razem z zespołem backendu, kreator sklepów internetowych (sklepów z przedmiotami) dla administratorów serwerów.',
    },
    org: 'Vitresoft',
    tags: ['React', 'TypeScript'],
  },
  {
    n: '03',
    title: { en: 'Real-time support chat', pl: 'Czat wsparcia w czasie rzeczywistym' },
    desc: {
      en: 'Built a custom real-time chat frontend (WebSocket) for help seekers, volunteers and admins; created and maintain the shared React / React Native component library.',
      pl: 'Zbudowałem własny frontend czatu w czasie rzeczywistym (WebSocket) dla osób szukających pomocy, wolontariuszy i administratorów; stworzyłem i utrzymuję wspólną bibliotekę komponentów React / React Native.',
    },
    org: 'Fundacja Peryskop',
    tags: ['WebSocket', 'React'],
  },
  {
    n: '04',
    title: { en: 'Volunteer matching system', pl: 'System dopasowywania wolontariuszy' },
    desc: {
      en: 'Prepared requirements, documentation and logic diagrams for an automated matching system pairing help seekers with volunteers, used as the basis for its backend implementation.',
      pl: 'Przygotowałem wymagania, dokumentację i diagramy logiki automatycznego systemu łączącego osoby szukające pomocy z wolontariuszami, które posłużyły za podstawę jego implementacji po stronie backendu.',
    },
    org: 'Fundacja Peryskop',
    tags: ['Requirements', 'Diagrams'],
  },
  {
    n: '05',
    title: { en: 'Gaming event web apps', pl: 'Aplikacje webowe na wydarzenia gamingowe' },
    desc: {
      en: 'Built web apps for Polish gaming-industry events featuring popular Polish content creators.',
      pl: 'Budowałem aplikacje webowe na polskie wydarzenia branży gamingowej z udziałem popularnych polskich twórców internetowych.',
    },
    org: 'Vitresoft',
    tags: ['Next.js', 'Astro'],
  },
];

export const projects: readonly Project[] = rawProjects.map((project) => ({
  ...project,
  title: { ...project.title, pl: polishTypography(project.title.pl) },
  desc: { ...project.desc, pl: polishTypography(project.desc.pl) },
}));
