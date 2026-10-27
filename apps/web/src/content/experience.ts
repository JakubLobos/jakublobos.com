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

// Owner-edited copy (EN and PL). PL is still flagged for owner review (D-02).
// A bullet may hold one inline link written as [label](https://…), see lib/inline-link.ts.
const entries: readonly ExperienceEntry[] = [
  {
    id: 'vitresoft',
    kind: 'experience',
    paint: 'blue',
    org: 'Vitresoft',
    copy: {
      en: {
        date: 'Sep 2023 — Present',
        title: 'Software Engineer · Vitresoft',
        sub: 'One of Poland’s largest game server hosting providers · craftserve.com · intern Jul — Aug 2023',
        bullets: [
          'Co-built, from the pre-launch stage, a game server management platform that replaced the company’s legacy [Pterodactyl](https://pterodactyl.io/)-based solution; now develop it largely single-handedly as the sole frontend developer.',
          'Design interfaces and own UI/UX decisions; design and run A/B tests aimed at improving user experience and sales.',
          'Work with AI agents: delegate tasks, review generated code and verify changes.',
          'Built web apps for live events with Poland’s biggest gaming creators under tight deadlines.',
          'Developed and maintained the in-browser server console, a dedicated WebFTP client and internal libraries (UI components, csrvfs for file handling).',
          'Designed and built purchase and sign-up forms, a gRPC-based server process view and authorization management; also handled performance optimization.',
          'Mentored interns and supported the growth of their programming skills.',
        ],
      },
      pl: {
        date: 'wrz 2023 — obecnie',
        title: 'Software Engineer · Vitresoft',
        sub: 'Jeden z największych polskich dostawców hostingu serwerów gier · craftserve.com · praktyki lip — sie 2023',
        bullets: [
          'Współtworzyłem od etapu przed startem platformę do zarządzania serwerami gier, która zastąpiła dawne firmowe rozwiązanie oparte na [Pterodactylu](https://pterodactyl.io/); dziś rozwijam ją w większości samodzielnie, jako jedyny programista frontendu.',
          'Projektuję interfejsy i odpowiadam za decyzje UI/UX; projektuję i prowadzę testy A/B, które mają poprawiać doświadczenie użytkowników i sprzedaż.',
          'Pracuję z agentami AI: deleguję zadania, sprawdzam wygenerowany kod i weryfikuję zmiany.',
          'Tworzyłem aplikacje webowe na eventy z największymi polskimi twórcami gamingowymi, pod ścisłymi terminami.',
          'Rozwijałem i utrzymywałem przeglądarkową konsolę serwera, dedykowanego klienta WebFTP oraz wewnętrzne biblioteki (komponenty UI, csrvfs do obsługi plików).',
          'Projektowałem i budowałem formularze zakupu i zakładania konta, podgląd procesów serwera oparty na gRPC oraz zarządzanie autoryzacją; dbałem też o optymalizację.',
          'Mentorowałem stażystów i wspierałem rozwój ich umiejętności programistycznych.',
        ],
      },
    },
  },
  {
    id: 'peryskop',
    kind: 'experience',
    paint: 'violet',
    org: 'Fundacja Peryskop',
    copy: {
      en: {
        date: 'Feb 2023 — Present',
        title: 'Software Engineer · Fundacja Peryskop',
        sub: 'Non-profit · free online psychological support platform · fundacjaperyskop.org',
        bullets: [
          'Joined as the first developer on the team and saw the project through its whole evolution: from a form-handling tool to a psychological support platform that now helps people in crisis.',
          'Focus mainly on the frontend and UI/UX design, and step into the backend when needed.',
          'Design interfaces for non-technical users: identify pain points in their daily work and simplify key tasks.',
          'Act as a bridge between the organization and the technical team: select developer candidates, run code reviews and mentor less experienced frontend developers.',
          'Built key parts of the frontend: a WebSocket-based chat, admin panels, integrations with dedicated form systems, articles with an article editor, and permissions.',
        ],
      },
      pl: {
        date: 'lut 2023 — obecnie',
        title: 'Software Engineer · Fundacja Peryskop',
        sub: 'Organizacja non-profit · bezpłatna platforma wsparcia psychologicznego online · fundacjaperyskop.org',
        bullets: [
          'Byłem pierwszym programistą w zespole i przeszedłem z projektem całą drogę: od narzędzia do obsługi formularzy do platformy wsparcia psychologicznego, która dziś pomaga osobom w kryzysie.',
          'Zajmuję się głównie frontendem oraz UI/UX designem, a w razie potrzeby wspieram też backend.',
          'Projektuję interfejsy dla osób nietechnicznych: wyszukuję bolączki w ich codziennej pracy i upraszczam kluczowe zadania.',
          'Łączę organizację z zespołem technicznym: wybieram kandydatów na programistów, prowadzę code review i mentoruję mniej doświadczonych programistów frontendu.',
          'Zaimplementowałem kluczowe elementy frontendu: czat oparty na WebSocketach, panele administracyjne, integracje z dedykowanymi systemami formularzy, artykuły wraz z edytorem oraz uprawnienia.',
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
