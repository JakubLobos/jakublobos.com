import type { Locale } from '@portfolio/contracts';
import { polishDeep } from '../../lib/pl-typography.ts';
import { profile } from '../../content/profile.ts';

/*
 * DRAFT: requires owner and legal review before go-live. The data table here covers the same
 * processings as docs/security.md §8, grouped into fewer rows (storage entries live only in
 * the cookies table); keep the facts in sync. The Polish text is a draft for the
 * owner's language review (D-02).
 *
 * The Railway region was set before the service existed (2026-10-28); confirm it matches the
 * region chosen in Railway.
 *
 * LEGAL-REVIEW: PostHog cookieless counting for visitors who choose "Only essential" is a
 * legitimate-interest claim (ADR-0011); whether ePrivacy requires consent for it is a legal call.
 */

/** ISO date of the last substantive change; shown as "last updated". */
export const PRIVACY_LAST_UPDATED = '2026-10-28';

export type PolicyBlock =
  | { readonly type: 'p'; readonly text: string }
  | { readonly type: 'ul'; readonly items: readonly string[] }
  | {
      readonly type: 'dl';
      readonly items: readonly {
        readonly term: string;
        readonly value: string;
        readonly href?: string;
      }[];
    }
  | {
      readonly type: 'table';
      readonly caption: string;
      readonly head: readonly string[];
      readonly rows: readonly (readonly string[])[];
    };

export interface PolicySection {
  readonly id: string;
  readonly heading: string;
  readonly blocks: readonly PolicyBlock[];
}

interface PrivacyCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly lastUpdated: string;
  readonly sections: readonly PolicySection[];
}

const email = `mailto:${profile.email}`;

const en: PrivacyCopy = {
  eyebrow: 'LEGAL',
  title: 'Privacy policy',
  lead: 'This site collects as little as possible. Below: what is processed, who handles it, and your rights.',
  lastUpdated: 'Last updated',
  sections: [
    {
      id: 'controller',
      heading: 'Who is responsible',
      blocks: [
        {
          type: 'dl',
          items: [
            { term: 'Controller', value: profile.name },
            {
              term: 'Address',
              value: 'PO Box 10, ul. Wielicka 42C, 30-552 Kraków, Poland',
            },
            { term: 'Email', value: profile.email, href: email },
          ],
        },
        {
          type: 'p',
          text: 'Write to this address for anything in this policy, including the requests described under “Your rights”.',
        },
      ],
    },
    {
      id: 'data',
      heading: 'What is processed, why, and for how long',
      blocks: [
        {
          type: 'p',
          text: 'Nothing is processed for advertising or sold. The table lists everything, with the legal basis under the GDPR (Art. 6(1)(a) consent, (b) steps before a contract, (f) legitimate interests). Transfers outside the EEA rely on the safeguards the provider offers under Chapter V of the GDPR.',
        },
        {
          type: 'table',
          caption: 'Personal data processed on this site',
          head: ['Data', 'Purpose', 'Legal basis', 'Where', 'Retention'],
          rows: [
            [
              'Guestbook text, paint colour, page language',
              'Show the newest approved message publicly and keep a private archive',
              'Consent (you submit it voluntarily; a notice sits under the form)',
              'Database on Railway, region EU West (Amsterdam)',
              'Shown publicly until a newer message replaces it, then kept in a private archive of at most 100 messages until newer ones push it out. A message not yet reviewed is deleted after 24 hours at most. Deleted on request. Copies stay in the daily backups for up to 6 days.',
            ],
            [
              'Guestbook text sent to Google (Gemini API) for automated moderation',
              'Safety check and suitability review',
              'Legitimate interest',
              'Google (Gemini API). Operated from the EEA, so the paid-service data terms apply; not used to improve Google products. Your IP address is not sent.',
              'Logged by Google for 55 days for abuse monitoring',
            ],
            [
              'Contact form: name, email, message',
              'Reply to your enquiry',
              'Steps before a contract / legitimate interest',
              'Resend (email delivery, in transit) passes name, email and message to the owner’s mailbox',
              'Not stored by the site’s server. Resend keeps delivery logs per its own settings. The mailbox keeps the conversation for up to 12 months after the last message, or longer if it leads to a collaboration.',
            ],
            [
              'Browser signals and your IP address for the Cloudflare Turnstile check',
              'Bot check before the phone number is shown or the resume is downloaded',
              'Legitimate interest (securing a function you asked for)',
              'Cloudflare. Loaded only after you click “Show number” or “Get my resume”; the API then sends your IP address to Cloudflare to verify the check.',
              'Per Cloudflare',
            ],
            [
              'Technical request data: IP address, browser user agent, requested URL, time',
              'Deliver the site and the API and protect them; rate limiting against abuse',
              'Legitimate interest',
              'Cloudflare (site) and Railway (API), as processors. For rate limiting the API keeps the IP address in memory only; the app never saves it to disk or writes it to logs. It is also sent to Cloudflare if you reveal the phone number or download the resume (see above).',
              'Logs: per the hosts’ log retention. Rate limiting: a window of at most 24 hours, kept in memory only, never on disk or in logs; lost on restart.',
            ],
            [
              'Visit statistics (Google Analytics 4)',
              'Visit statistics',
              'Consent (“Accept”)',
              'Google (US). Loaded only if you press “Accept” in the cookie banner.',
              '2 months, the shortest period GA4 offers',
            ],
            [
              'PostHog product analytics',
              'With “Accept”: product analytics. With “Only essential”: counting visits in aggregate without storing anything on your device',
              'With “Accept”: consent. With “Only essential”: legitimate interest',
              'PostHog EU cloud. With “Accept” it uses its cookies; with “Only essential” it uses a server-side hash. Until you choose, it does nothing.',
              'Per the PostHog project settings',
            ],
          ],
        },
        {
          type: 'p',
          text: 'The guestbook has no accounts and the site stores no identifier with your message, so a message can only be found by its text. Please do not put personal data in it; the form rejects emails and phone numbers.',
        },
        {
          type: 'p',
          text: 'Whether a guestbook message is published is decided automatically by simple text rules and the Google (Gemini API) checks described in the table above. This has no legal effect on you. If you disagree, write to the address above.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies and local storage',
      blocks: [
        {
          type: 'p',
          text: 'The first three entries are strictly necessary and used without your consent; the rest need it. Choose “Only essential” and nothing else is stored. You can change your choice at any time with “Cookie settings” in the footer; withdrawing consent stops Google Analytics, removes its cookies, and switches PostHog to cookieless counting.',
        },
        {
          type: 'table',
          caption: 'Cookies and browser storage',
          head: ['Name', 'Purpose', 'Set when', 'Legal basis', 'Lasts'],
          rows: [
            [
              'lang (cookie)',
              'Your explicit language choice',
              'You use the language switch',
              'Strictly necessary (you asked for it)',
              '1 year',
            ],
            [
              'jl-cookies (local storage)',
              'Your cookie choice',
              'You answer the cookie banner',
              'Strictly necessary',
              'Until you change it',
            ],
            [
              'jl-contact-draft (session storage)',
              'Your unsent contact-form draft; never sent',
              'You type in the contact form',
              'Strictly necessary (you asked for it)',
              'Until you close the tab or send the message',
            ],
            [
              '_ga, _ga_* (cookies)',
              'Google Analytics',
              'You press “Accept”',
              'Consent',
              'Per GA4 settings',
            ],
            [
              'PostHog keys (cookies and local storage)',
              'PostHog analytics',
              'You press “Accept”',
              'Consent',
              'Per PostHog settings',
            ],
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: 'Your rights',
      blocks: [
        {
          type: 'p',
          text: 'Under the GDPR you may ask me to:',
        },
        {
          type: 'ul',
          items: [
            'tell you whether I process your data and give you a copy (access),',
            'correct inaccurate data (rectification),',
            'delete your data (erasure), for example a guestbook message,',
            'limit the processing, or receive your data in a portable form where that applies,',
            'stop processing that is based on legitimate interest (objection).',
          ],
        },
        {
          type: 'p',
          text: 'Where processing rests on consent you can withdraw it at any time; this does not affect what happened before. To find a guestbook message, quote its text.',
        },
        {
          type: 'p',
          text: 'You may also complain to the supervisory authority: in Poland, the President of the Personal Data Protection Office (UODO, uodo.gov.pl), or the authority in your own EU country.',
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to this policy',
      blocks: [
        {
          type: 'p',
          text: 'If the site starts processing data differently, this page is updated first and the date above changes.',
        },
      ],
    },
  ],
};

const pl: PrivacyCopy = {
  eyebrow: 'PRAWNE',
  title: 'Polityka prywatności',
  lead: 'Ta strona zbiera jak najmniej danych. Poniżej: co jest przetwarzane, kto się tym zajmuje i jakie masz prawa.',
  lastUpdated: 'Ostatnia aktualizacja',
  sections: [
    {
      id: 'controller',
      heading: 'Kto jest odpowiedzialny',
      blocks: [
        {
          type: 'dl',
          items: [
            { term: 'Administrator', value: profile.name },
            {
              term: 'Adres',
              value: 'Skrytka pocztowa nr 10, ul. Wielicka 42C, 30-552 Kraków',
            },
            { term: 'E-mail', value: profile.email, href: email },
          ],
        },
        {
          type: 'p',
          text: 'Pod tym adresem możesz zgłaszać wszystkie sprawy związane z tą polityką, w tym wnioski opisane w części „Twoje prawa”.',
        },
      ],
    },
    {
      id: 'data',
      heading: 'Co jest przetwarzane, po co i jak długo',
      blocks: [
        {
          type: 'p',
          text: 'Dane nie są przetwarzane w celach reklamowych ani sprzedawane. Tabela wymienia wszystko wraz z podstawą prawną według RODO (art. 6 ust. 1 lit. a zgoda, lit. b działania przed zawarciem umowy, lit. f prawnie uzasadniony interes). Przekazanie danych poza EOG opiera się na zabezpieczeniach oferowanych przez dostawcę zgodnie z rozdziałem V RODO.',
        },
        {
          type: 'table',
          caption: 'Dane osobowe przetwarzane na tej stronie',
          head: ['Dane', 'Cel', 'Podstawa prawna', 'Gdzie', 'Okres przechowywania'],
          rows: [
            [
              'Treść wpisu w księdze gości, kolor farby, język strony',
              'Publiczne wyświetlanie najnowszego zatwierdzonego wpisu i prywatne archiwum',
              'Zgoda (wpis wysyłasz dobrowolnie; informacja znajduje się pod formularzem)',
              'Baza danych w Railway, region EU West (Amsterdam)',
              'Widoczny publicznie, dopóki nie zastąpi go nowszy wpis, następnie przechowywany w prywatnym archiwum liczącym najwyżej 100 wpisów, dopóki nie wypchną go nowsze. Wpis, który nie został jeszcze sprawdzony, jest usuwany najpóźniej po 24 godzinach. Usuwany na żądanie. Wpis pozostaje w codziennych kopiach zapasowych najwyżej 6 dni.',
            ],
            [
              'Treść wpisu wysyłana do Google (Gemini API) w celu automatycznej moderacji',
              'Kontrola bezpieczeństwa i ocena przydatności',
              'Prawnie uzasadniony interes',
              'Google (Gemini API). Przetwarzane na warunkach danych Google dla usługi płatnej, ponieważ strona jest prowadzona z EOG; nie służy do ulepszania produktów Google. Twój adres IP nie jest wysyłany.',
              'Logowane przez Google przez 55 dni w celu wykrywania nadużyć',
            ],
            [
              'Formularz kontaktowy: imię, e-mail, wiadomość',
              'Odpowiedź na Twoje zapytanie',
              'Działania przed zawarciem umowy / prawnie uzasadniony interes',
              'Resend (dostarczanie poczty, w trakcie przesyłania) przekazuje imię, e-mail i wiadomość do skrzynki właściciela',
              'Serwer strony niczego nie zapisuje. Resend przechowuje logi dostarczenia zgodnie z własnymi ustawieniami. Skrzynka przechowuje korespondencję do 12 miesięcy od ostatniej wiadomości, a dłużej, jeśli rozmowa przerodzi się we współpracę.',
            ],
            [
              'Sygnały przeglądarki i Twój adres IP dla kontroli Cloudflare Turnstile',
              'Sprawdzenie, czy nie jesteś botem, przed pokazaniem numeru telefonu lub pobraniem CV',
              'Prawnie uzasadniony interes (zabezpieczenie funkcji, o którą prosisz)',
              'Cloudflare. Ładowane dopiero po kliknięciu „Pokaż numer” lub „Pobierz moje CV”; API wysyła wtedy Twój adres IP do Cloudflare w celu weryfikacji.',
              'Zgodnie z zasadami Cloudflare',
            ],
            [
              'Dane techniczne żądań: adres IP, user agent przeglądarki, żądany adres URL, czas',
              'Dostarczanie strony i API oraz ich ochrona; ograniczanie liczby żądań w celu ochrony przed nadużyciami',
              'Prawnie uzasadniony interes',
              'Cloudflare (strona) i Railway (API), jako podmioty przetwarzające. Do ograniczania liczby żądań API trzyma adres IP wyłącznie w pamięci; aplikacja nigdy nie zapisuje go na dysku ani w logach. Jest też wysyłany do Cloudflare, gdy odsłaniasz numer telefonu lub pobierasz CV (patrz wyżej).',
              'Logi: zgodnie z okresem przechowywania u dostawców. Ograniczanie liczby żądań: okno najwyżej 24 godzin, wyłącznie w pamięci, nigdy na dysku ani w logach; znika po restarcie.',
            ],
            [
              'Statystyki odwiedzin (Google Analytics 4)',
              'Statystyki odwiedzin',
              'Zgoda („Akceptuję”)',
              'Google (USA). Ładowany tylko po kliknięciu „Akceptuję” w komunikacie o cookies.',
              '2 miesiące, najkrótszy okres dostępny w GA4',
            ],
            [
              'Analityka produktowa PostHog',
              'Z „Akceptuję”: analityka produktowa. Z „Tylko niezbędne”: zliczanie odwiedzin zbiorczo, bez zapisywania czegokolwiek na Twoim urządzeniu',
              'Z „Akceptuję”: zgoda. Z „Tylko niezbędne”: prawnie uzasadniony interes',
              'Chmura PostHog w UE. Z „Akceptuję” używa cookies; z „Tylko niezbędne” używa skrótu liczonego po stronie serwera. Do czasu dokonania wyboru nic nie robi.',
              'Zgodnie z ustawieniami projektu PostHog',
            ],
          ],
        },
        {
          type: 'p',
          text: 'Księga gości nie ma kont, a strona nie zapisuje przy Twoim wpisie żadnego identyfikatora, więc wpis można odnaleźć tylko po jego treści. Proszę, nie wpisuj danych osobowych; formularz odrzuca adresy e-mail i numery telefonu.',
        },
        {
          type: 'p',
          text: 'O publikacji wpisu w księdze gości decydują automatycznie proste reguły tekstowe oraz kontrole Google (Gemini API) opisane w tabeli powyżej. Nie ma to wobec Ciebie skutków prawnych. Jeśli się z tym nie zgadzasz, napisz na adres podany wyżej.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies i pamięć lokalna',
      blocks: [
        {
          type: 'p',
          text: 'Trzy pierwsze wpisy są niezbędne i używane bez Twojej zgody; pozostałe wymagają zgody. Jeśli wybierzesz „Tylko niezbędne”, nic więcej nie jest zapisywane. Wybór możesz zmienić w dowolnej chwili przez „Ustawienia cookies” w stopce; wycofanie zgody zatrzymuje Google Analytics, usuwa jego cookies i przełącza PostHog na zliczanie bez cookies.',
        },
        {
          type: 'table',
          caption: 'Cookies i pamięć przeglądarki',
          head: ['Nazwa', 'Cel', 'Kiedy powstaje', 'Podstawa prawna', 'Czas trwania'],
          rows: [
            [
              'lang (cookie)',
              'Wybrany przez Ciebie język',
              'Używasz przełącznika języka',
              'Niezbędne (o to prosisz)',
              '1 rok',
            ],
            [
              'jl-cookies (local storage)',
              'Twój wybór dotyczący cookies',
              'Odpowiadasz na komunikat o cookies',
              'Niezbędne',
              'Do czasu zmiany wyboru',
            ],
            [
              'jl-contact-draft (pamięć sesji)',
              'Twoja niewysłana wersja robocza wiadomości; nigdy nie jest wysyłana',
              'Piszesz w formularzu kontaktowym',
              'Niezbędne (o to prosisz)',
              'Do zamknięcia karty lub wysłania wiadomości',
            ],
            [
              '_ga, _ga_* (cookies)',
              'Google Analytics',
              'Klikasz „Akceptuję”',
              'Zgoda',
              'Zgodnie z ustawieniami GA4',
            ],
            [
              'Klucze PostHog (cookies i local storage)',
              'Analityka PostHog',
              'Klikasz „Akceptuję”',
              'Zgoda',
              'Zgodnie z ustawieniami PostHog',
            ],
          ],
        },
      ],
    },
    {
      id: 'rights',
      heading: 'Twoje prawa',
      blocks: [
        {
          type: 'p',
          text: 'Na podstawie RODO możesz zażądać ode mnie:',
        },
        {
          type: 'ul',
          items: [
            'informacji, czy przetwarzam Twoje dane, i kopii tych danych (dostęp),',
            'sprostowania nieprawidłowych danych,',
            'usunięcia danych, na przykład wpisu w księdze gości,',
            'ograniczenia przetwarzania lub przeniesienia danych, gdy ma to zastosowanie,',
            'zaprzestania przetwarzania opartego na prawnie uzasadnionym interesie (sprzeciw).',
          ],
        },
        {
          type: 'p',
          text: 'Jeśli przetwarzanie opiera się na zgodzie, możesz ją w każdej chwili wycofać; nie wpływa to na zgodność z prawem wcześniejszego przetwarzania. Aby odnaleźć wpis w księdze gości, podaj jego treść.',
        },
        {
          type: 'p',
          text: 'Możesz też złożyć skargę do organu nadzorczego: w Polsce do Prezesa Urzędu Ochrony Danych Osobowych (UODO, uodo.gov.pl) albo do organu w Twoim kraju UE.',
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Zmiany tej polityki',
      blocks: [
        {
          type: 'p',
          text: 'Jeśli strona zacznie przetwarzać dane inaczej, najpierw zaktualizuję tę stronę, a data powyżej się zmieni.',
        },
      ],
    },
  ],
};

// Ids and hrefs are identifiers, not prose, so they never receive non-breaking spaces.
const copy: Record<Locale, PrivacyCopy> = { en, pl: polishDeep(pl, new Set(['id', 'href'])) };

export function privacy(locale: Locale): PrivacyCopy {
  return copy[locale];
}
