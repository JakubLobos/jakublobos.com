import type { Locale } from '@portfolio/contracts';
import { polishTypography } from '../lib/pl-typography.ts';

type Localized = Record<Locale, string>;

export type ProjectLinkKind = 'website' | 'frontend' | 'ui' | 'source';

export interface ProjectLink {
  /** The visible label comes from i18n, keyed by this kind. */
  kind: ProjectLinkKind;
  href: string;
}

interface RawProject {
  id: string;
  title: Localized;
  paragraphs: Record<Locale, readonly string[]>;
  org: string | null;
  /** Technology names are kept in English in every locale. */
  tags: readonly string[];
  links?: readonly ProjectLink[];
}

export interface Project extends RawProject {
  /** Display number derived from the order below. */
  n: string;
}

// PL texts are drafts pending owner review (D-02).
const rawProjects: readonly RawProject[] = [
  {
    id: 'game-hosting-platform',
    title: {
      en: 'Game Hosting Platform & Server Management Dashboard',
      pl: 'Platforma hostingu gier i panel zarządzania serwerem',
    },
    paragraphs: {
      en: [
        'I developed key modules of a game server hosting platform, including the server management panel (settings, payment flow, an in-browser file manager (WebFTP), a web console, and server configurators). I also worked on the public-facing website: the homepage, offer pages, payment forms, and a server builder tailored to users’ needs. The platform caters to a wide audience, from young gamers to experienced server administrators, so I focused on making complex functionality simple and accessible.',
        'I was responsible for UI/UX design, including a redesign, as well as for developing the company’s internal TypeScript frontend libraries. I started as part of a frontend team and later became the sole frontend developer on the product, taking full ownership of the codebase and its technical direction.',
      ],
      pl: [
        'Rozwijałem kluczowe moduły platformy hostingu serwerów gier, w tym panel zarządzania serwerem (ustawienia, proces płatności, przeglądarkowy menedżer plików WebFTP, konsolę webową i konfiguratory serwerów). Pracowałem również nad publiczną częścią platformy: stroną główną, stronami ofertowymi, formularzami płatności oraz kreatorem serwerów dopasowanym do potrzeb użytkowników. Platforma jest skierowana do szerokiego grona odbiorców, od młodych graczy po doświadczonych administratorów, dlatego skupiałem się na tym, by złożone funkcje przedstawiać prosto i przystępnie.',
        'Odpowiadałem za projektowanie UI/UX, w tym redesign, a także za rozwój wewnętrznych bibliotek frontendowych firmy w TypeScripcie. Zaczynałem w zespole frontendowym, a później zostałem jedynym frontend developerem w tym produkcie, przejmując pełną odpowiedzialność za kod i kierunek jego rozwoju.',
      ],
    },
    org: 'Vitresoft',
    tags: [
      'React',
      'TypeScript',
      'Redux Toolkit',
      'gRPC',
      'monorepo',
      'react-email',
      'Formik',
      'i18next',
      'TanStack',
      'Chart.js',
      'styled-components',
      'Superstruct',
      'Yup',
      'PostHog',
      'A/B testing',
      'ts-money',
      'Astro',
      'Jest',
      'React Testing Library',
      'Playwright',
      'UI/UX design',
      'AI-assisted coding',
    ],
    links: [{ kind: 'website', href: 'https://craftserve.com/' }],
  },
  {
    id: 'item-shop-builder',
    title: { en: 'Item Shop Builder', pl: 'Item Shop Builder' },
    paragraphs: {
      en: [
        'An application that allows game server administrators to build their own item shops, where players can purchase virtual products. I worked on it as part of a team, alongside other frontend and backend developers. After moving to another product, I continued to support the project by supervising the interns working on it.',
      ],
      pl: [
        'Aplikacja umożliwiająca administratorom serwerów gier budowanie własnych itemshopów, w których gracze mogą kupować wirtualne produkty. Pracowałem nad nią w zespole, razem z innymi frontend i backend developerami. Po przejściu do innego produktu nadal wspierałem projekt, nadzorując pracę praktykantów.',
      ],
    },
    org: 'Vitresoft',
    tags: [
      'React',
      'TypeScript',
      'Redux',
      'Chart.js',
      'Formik',
      'i18next',
      'ts-money',
      'Yup',
      'MUI',
      'styled-components',
    ],
  },
  {
    id: 'streamer-event-apps',
    title: {
      en: 'Web Apps for Events Hosted by Popular Polish Streamers',
      pl: 'Aplikacje webowe na wydarzenia popularnych polskich streamerów',
    },
    paragraphs: {
      en: [
        'I developed a variety of web applications for online events hosted by some of Poland’s most popular gaming streamers. I worked both independently and as part of a team, often under tight deadlines.',
      ],
      pl: [
        'Tworzyłem różnorodne aplikacje webowe na potrzeby wydarzeń online organizowanych przez jednych z najpopularniejszych polskich streamerów gamingowych. Pracowałem zarówno samodzielnie, jak i w zespole, często pod presją krótkich terminów.',
      ],
    },
    org: 'Vitresoft',
    tags: ['React', 'TypeScript'],
  },
  {
    id: 'psychological-support-platform',
    title: {
      en: 'Free Psychological Support Platform',
      pl: 'Platforma bezpłatnej pomocy psychologicznej',
    },
    paragraphs: {
      en: [
        'I developed the frontend of a platform for a foundation providing free psychological support, including a dedicated real-time chat. The platform features an admin panel for approving applications, matching people seeking support with volunteers, approving and editing articles, managing user permissions, forms, and chats, and browsing large lists such as user directories.',
        'I also designed the application’s UI. To support the mobile app, I created a shared UI component library built on Tamagui, used by both the web app and the React Native app.',
      ],
      pl: [
        'Stworzyłem frontend platformy fundacji oferującej bezpłatną pomoc psychologiczną, wraz z dedykowanym czatem działającym w czasie rzeczywistym. Platforma zawiera panel zarządzania, w którym można akceptować formularze, łączyć podopiecznych z wolontariuszami, akceptować i redagować artykuły, zarządzać uprawnieniami użytkowników, formularzami i czatami oraz przeglądać duże listy, takie jak listy użytkowników.',
        'Zaprojektowałem także interfejs aplikacji. Na potrzeby aplikacji mobilnej stworzyłem współdzieloną bibliotekę komponentów UI opartą na Tamagui, wykorzystywaną zarówno w aplikacji webowej, jak i w aplikacji napisanej w React Native.',
      ],
    },
    org: 'Fundacja Peryskop',
    tags: [
      'React',
      'TypeScript',
      'Next.js',
      'Tamagui',
      'TanStack',
      'Formik',
      'WebSocket',
      'i18next',
      'PostHog',
      'Tailwind',
      'Vitest',
      'UI/UX design',
    ],
    links: [
      { kind: 'website', href: 'https://fundacjaperyskop.org/' },
      {
        kind: 'frontend',
        href: 'https://github.com/fundacja-peryskop/MentalHealthCharity-front-v2',
      },
      { kind: 'ui', href: 'https://github.com/fundacja-peryskop/ui' },
    ],
  },
  {
    id: 'this-portfolio',
    title: { en: 'This Portfolio', pl: 'To portfolio' },
    paragraphs: {
      en: ['You’re looking at it right now.'],
      pl: ['Właśnie tu jesteś!'],
    },
    org: null,
    tags: ['Astro', 'Node.js'],
    links: [{ kind: 'source', href: 'https://github.com/JakubLobos/jakublobos.com' }],
  },
];

export const projects: readonly Project[] = rawProjects.map((project, index) => ({
  ...project,
  n: String(index + 1).padStart(2, '0'),
  title: { ...project.title, pl: polishTypography(project.title.pl) },
  paragraphs: { ...project.paragraphs, pl: project.paragraphs.pl.map(polishTypography) },
}));
