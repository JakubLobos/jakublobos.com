import type { Locale, PaintId } from '@portfolio/contracts';
import { polishDeep } from '../lib/pl-typography.ts';

interface LocalizedEntry {
  date: string;
  title: string;
  sub: string;
  bullets: readonly string[];
}

export interface ExperienceEntry {
  id: string;
  kind: 'experience' | 'education';
  paint: PaintId;
  /** Organisation names are proper nouns, so they are not localized. */
  org: string;
  copy: Record<Locale, LocalizedEntry>;
}

// EN is verbatim from the design. PL is a draft for owner review (D-02).
const entries: readonly ExperienceEntry[] = [
  {
    id: 'peryskop',
    kind: 'experience',
    paint: 'violet',
    org: 'Fundacja Peryskop',
    copy: {
      en: {
        date: '2023 — Present',
        title: 'Frontend Developer · Fundacja Peryskop',
        sub: 'Free online psychological support platform · fundacjaperyskop.org',
        bullets: [
          'Joined as the sole developer and grew the application from a form-handling tool into a platform supporting the delivery of psychological help.',
          'Developed volunteer availability management, authorization and access control, forms and the landing page.',
          'Design interfaces for non-technical users: identify pain points in their daily work and simplify key tasks',
          'Act as a bridge between the organization and the technical team; select developer candidates, conduct code reviews, and mentor less experienced frontend developers',
        ],
      },
      pl: {
        date: '2023 — obecnie',
        title: 'Frontend Developer · Fundacja Peryskop',
        sub: 'Bezpłatna internetowa platforma wsparcia psychologicznego · fundacjaperyskop.org',
        bullets: [
          'Dołączyłem jako jedyny programista i rozwinąłem aplikację z narzędzia do obsługi formularzy w platformę wspierającą udzielanie pomocy psychologicznej.',
          'Zaimplementowałem zarządzanie dostępnością wolontariuszy, autoryzację i kontrolę dostępu, formularze oraz stronę docelową.',
          'Projektuję interfejsy dla osób nietechnicznych: wyszukuję bolączki w ich codziennej pracy i upraszczam kluczowe zadania.',
          'Łączę organizację z zespołem technicznym; wybieram kandydatów na programistów, prowadzę code review i mentoruję mniej doświadczonych programistów frontendu.',
        ],
      },
    },
  },
  {
    id: 'vitresoft',
    kind: 'experience',
    paint: 'blue',
    org: 'Vitresoft',
    copy: {
      en: {
        date: '2023 — Present',
        title: 'Junior Frontend Developer · Vitresoft',
        sub: 'One of Poland’s largest game server hosting providers · craftserve.com',
        bullets: [
          'Co-building, since the pre-launch stage, a new hosting management platform that replaced a Pterodactyl-based solution; now responsible for its ongoing development as the sole frontend developer.',
          'Design interfaces and own UI/UX decisions; design and run A/B tests aimed at improving user experience and sales.',
          'Work with AI agents: delegate tasks, review generated code and verify changes on staging before merging.',
          'Mentor interns and support the growth of their programming skills.',
        ],
      },
      pl: {
        date: '2023 — obecnie',
        title: 'Junior Frontend Developer · Vitresoft',
        sub: 'Jeden z największych polskich dostawców hostingu serwerów gier · craftserve.com',
        bullets: [
          'Współtworzę od etapu przed startem nową platformę do zarządzania hostingiem, która zastąpiła rozwiązanie oparte na Pterodactylu; obecnie odpowiadam za jej rozwój jako jedyny programista frontendu.',
          'Projektuję interfejsy i odpowiadam za decyzje UI/UX; projektuję i prowadzę testy A/B, które poprawiają doświadczenie użytkowników i sprzedaż.',
          'Pracuję z agentami AI: deleguję zadania, sprawdzam wygenerowany kod i weryfikuję zmiany na stagingu przed scaleniem.',
          'Mentoruję stażystów i wspieram rozwój ich umiejętności programistycznych.',
        ],
      },
    },
  },
  {
    id: 'wsb-nlu',
    kind: 'education',
    paint: 'red',
    org: 'WSB-NLU, Nowy Sącz',
    copy: {
      en: {
        date: 'Oct 2023 — Feb 2027',
        title: 'Bachelor of Engineering (Inż.) in Computer Science',
        sub: 'WSB-NLU, Nowy Sącz, Poland · part-time (weekend) studies · expected Feb 2027',
        bullets: [],
      },
      pl: {
        date: 'paź 2023 — lut 2027',
        title: 'Inżynier (inż.) informatyki',
        sub: 'WSB-NLU, Nowy Sącz, Polska · studia zaoczne (weekendowe) · planowane ukończenie: luty 2027',
        bullets: [],
      },
    },
  },
];

export const experience: readonly ExperienceEntry[] = entries.map((entry) => ({
  ...entry,
  copy: { ...entry.copy, pl: polishDeep(entry.copy.pl) },
}));
