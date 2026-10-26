import type { Locale } from '@portfolio/contracts';
import { polishDeep } from '../../lib/pl-typography.ts';
import { profile } from '../../content/profile.ts';

/*
 * DRAFT: requires owner and legal review before go-live. The text mirrors the data table in
 * docs/security.md §8 row by row; keep the two in sync. The Polish text is a draft for the
 * owner's language review (D-02).
 *
 * OWNER-PLACEHOLDER: every value written as "[OWNER: …]" (EN) or "[WŁAŚCICIEL: …]" (PL) is a
 * fact only the owner can supply. They are rendered visibly on the page and listed in
 * tasks/reports/T-033/. Search for "OWNER" / "WŁAŚCICIEL" before launch.
 *
 * LEGAL-REVIEW: PostHog cookieless counting for visitors who choose "Only essential" is a
 * legitimate-interest claim (ADR-0011); whether ePrivacy requires consent for it is a legal call.
 */

/** ISO date of the last substantive change; shown as "last updated". */
export const PRIVACY_LAST_UPDATED = '2026-10-26';

export type PolicyBlock =
  | { readonly type: 'p'; readonly text: string }
  | { readonly type: 'h3'; readonly text: string }
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
  lead: 'This site is a personal portfolio. It collects as little as possible. This page explains what is processed when you use the guestbook, the contact form, the phone number reveal, the language switch, or the cookie choices, who handles it, and what rights you have.',
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
              // OWNER-PLACEHOLDER
              value: '[OWNER: postal address, or business registration if you act as a business]',
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
          text: 'Nothing is processed for advertising or sold. The table lists everything, with the legal basis under the GDPR (Art. 6(1)(a) consent, (b) steps before a contract, (f) legitimate interests).',
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
              // OWNER-PLACEHOLDER (region)
              'Database on Railway, region [OWNER: Railway region]',
              // OWNER-PLACEHOLDER (backup retention)
              'Shown publicly until a newer message replaces it, then kept in a private archive of at most 100 messages until newer ones push it out. A message not yet reviewed is deleted after 24 hours at most. Deleted on request. Copies stay in backups until they rotate out [OWNER: confirm backup retention].',
            ],
            [
              'Guestbook text sent to OpenAI moderation',
              'Safety review',
              'Legitimate interest',
              'OpenAI (US). Not retained for abuse monitoring and not used for training.',
              'None',
            ],
            [
              'Guestbook text sent to OpenAI for a suitability review',
              'Check that the message fits a professional portfolio',
              'Legitimate interest',
              'OpenAI (US). Stored for abuse monitoring for up to 30 days; not used for training.',
              'Up to 30 days at OpenAI',
            ],
            [
              'Contact form: name, email, message',
              'Reply to your enquiry',
              'Steps before a contract / legitimate interest',
              'Resend (email delivery, in transit), then the owner’s mailbox',
              // OWNER-PLACEHOLDER (mailbox period)
              'Not stored by the site’s server. Resend keeps delivery logs per its own settings. The mailbox keeps the message as long as needed to handle the enquiry [OWNER: confirm period].',
            ],
            [
              'Browser signals and your IP address for the Cloudflare Turnstile check',
              'Bot check before the phone number is shown',
              'Legitimate interest (securing a function you asked for)',
              'Cloudflare. Loaded only after you click “Show number”; the API then sends your IP address to Cloudflare to verify the check.',
              'Per Cloudflare',
            ],
            [
              'IP address',
              'Rate limiting against abuse',
              'Legitimate interest',
              'The API keeps it in memory only; the app never saves it to disk or writes it to logs. It is also sent to Cloudflare if you reveal the phone number (see above).',
              'A window of at most 24 hours; lost on restart',
            ],
            [
              'Technical request data: IP address, browser user agent, requested URL, time',
              'Deliver the site and the API and protect them',
              'Legitimate interest',
              'Cloudflare (site) and Railway (API), as processors',
              'Per the hosts’ log retention',
            ],
            [
              '“lang” cookie',
              'Remember an explicit language choice',
              'Strictly necessary (you asked for it)',
              'Your browser',
              '1 year',
            ],
            [
              '“jl-cookies” (local storage)',
              'Remember your cookie choice',
              'Strictly necessary',
              'Your browser',
              'Until you change it',
            ],
            [
              'Google Analytics 4 cookies and identifiers',
              'Visit statistics',
              'Consent (“Accept”)',
              'Google (US)',
              // OWNER-PLACEHOLDER (GA4 retention)
              'Per the GA4 property settings, set to the shortest period available [OWNER: confirm]',
            ],
            [
              'PostHog, with consent',
              'Product analytics',
              'Consent (“Accept”)',
              'PostHog EU cloud',
              'Per the PostHog project settings',
            ],
            [
              'PostHog cookieless counting, after “Only essential”',
              'Count visits in aggregate without storing anything on your device',
              'Legitimate interest',
              'PostHog EU cloud (server-side hash)',
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
          text: 'Whether a guestbook message is published is decided automatically by simple text rules and the OpenAI checks described below. This has no legal effect on you. If you disagree, write to the address above.',
        },
      ],
    },
    {
      id: 'recipients',
      heading: 'Who else handles data',
      blocks: [
        {
          type: 'p',
          text: 'These providers handle data for the purposes in the table above. Transfers outside the EEA rely on the safeguards the provider offers under Chapter V of the GDPR.',
        },
        { type: 'h3', text: 'Cloudflare' },
        {
          type: 'p',
          text: 'Hosts and delivers the website, sets the “lang” cookie, and, like any host, handles the technical data of each request (IP address, browser user agent, requested URL, time). Cloudflare Turnstile, its bot check, is loaded only when you click “Show number” to reveal the phone number.',
        },
        { type: 'h3', text: 'Railway' },
        {
          type: 'p',
          // OWNER-PLACEHOLDER (region)
          text: 'Hosts the API and its database, which holds the guestbook, and handles the technical data of each API request (IP address, browser user agent, requested URL, time). Region: [OWNER: Railway region].',
        },
        { type: 'h3', text: 'OpenAI' },
        {
          type: 'p',
          text: 'Guestbook text is sent to OpenAI (United States) for two automated checks: a moderation check, which OpenAI does not retain, and a suitability review that is kept for up to 30 days for abuse monitoring. OpenAI does not use it for training. Your IP address is not sent.',
        },
        { type: 'h3', text: 'Resend' },
        {
          type: 'p',
          text: 'Delivers the contact form as an email to my mailbox. Your name, email address, and message pass through it.',
        },
        { type: 'h3', text: 'Google Analytics 4' },
        {
          type: 'p',
          text: 'Loaded only if you press “Accept” in the cookie banner. Google (United States) receives your visit data and sets its analytics cookies.',
        },
        { type: 'h3', text: 'PostHog (EU)' },
        {
          type: 'p',
          text: 'If you press “Accept”, PostHog records your visit with its cookies. If you press “Only essential”, it only counts visits in aggregate using a server-side hash, with no cookies or other storage on your device. Until you choose, it does nothing.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies and local storage',
      blocks: [
        {
          type: 'p',
          text: 'Only the first two entries are used without your consent. Choose “Only essential” and nothing else is stored. You can change your choice at any time with “Cookie settings” in the footer; withdrawing consent stops Google Analytics, removes its cookies, and switches PostHog to cookieless counting.',
        },
        {
          type: 'table',
          caption: 'Cookies and browser storage',
          head: ['Name', 'Purpose', 'Set when', 'Lasts'],
          rows: [
            [
              'lang (cookie)',
              'Your explicit language choice',
              'You use the language switch',
              '1 year',
            ],
            [
              'jl-cookies (local storage)',
              'Your cookie choice',
              'You answer the cookie banner',
              'Until you change it',
            ],
            ['_ga, _ga_* (cookies)', 'Google Analytics', 'You press “Accept”', 'Per GA4 settings'],
            [
              'PostHog keys (cookies and local storage)',
              'PostHog analytics',
              'You press “Accept”',
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
  lead: 'Ta strona to osobiste portfolio i zbiera jak najmniej danych. Poniżej wyjaśniam, co jest przetwarzane, gdy korzystasz z księgi gości, formularza kontaktowego, odsłonięcia numeru telefonu, przełącznika języka lub ustawień cookies, kto się tym zajmuje i jakie masz prawa.',
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
              // OWNER-PLACEHOLDER
              value:
                '[WŁAŚCICIEL: adres korespondencyjny lub dane rejestrowe działalności, jeśli działasz jako firma]',
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
          text: 'Dane nie są przetwarzane w celach reklamowych ani sprzedawane. Tabela wymienia wszystko wraz z podstawą prawną według RODO (art. 6 ust. 1 lit. a zgoda, lit. b działania przed zawarciem umowy, lit. f prawnie uzasadniony interes).',
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
              // OWNER-PLACEHOLDER (region)
              'Baza danych w Railway, region [WŁAŚCICIEL: region Railway]',
              // OWNER-PLACEHOLDER (backup retention)
              'Widoczny publicznie, dopóki nie zastąpi go nowszy wpis, następnie przechowywany w prywatnym archiwum liczącym najwyżej 100 wpisów, dopóki nie wypchną go nowsze. Wpis, który nie został jeszcze sprawdzony, jest usuwany najpóźniej po 24 godzinach. Usuwany na żądanie. Wpis pozostaje w kopiach zapasowych do czasu ich rotacji [WŁAŚCICIEL: potwierdź okres przechowywania kopii].',
            ],
            [
              'Treść wpisu wysyłana do moderacji OpenAI',
              'Kontrola bezpieczeństwa',
              'Prawnie uzasadniony interes',
              'OpenAI (USA). Bez przechowywania na potrzeby monitorowania nadużyć, nie służy do trenowania modeli.',
              'Brak',
            ],
            [
              'Treść wpisu wysyłana do OpenAI w celu oceny przydatności',
              'Sprawdzenie, czy wpis pasuje do profesjonalnego portfolio',
              'Prawnie uzasadniony interes',
              'OpenAI (USA). Przechowywana do 30 dni na potrzeby monitorowania nadużyć, nie służy do trenowania modeli.',
              'Do 30 dni u OpenAI',
            ],
            [
              'Formularz kontaktowy: imię, e-mail, wiadomość',
              'Odpowiedź na Twoje zapytanie',
              'Działania przed zawarciem umowy / prawnie uzasadniony interes',
              'Resend (dostarczanie poczty, w trakcie przesyłania), następnie skrzynka właściciela',
              // OWNER-PLACEHOLDER (mailbox period)
              'Serwer strony niczego nie zapisuje. Resend przechowuje logi dostarczenia zgodnie z własnymi ustawieniami. Skrzynka przechowuje wiadomość tak długo, jak trzeba, by obsłużyć zapytanie [WŁAŚCICIEL: potwierdź okres].',
            ],
            [
              'Sygnały przeglądarki i Twój adres IP dla kontroli Cloudflare Turnstile',
              'Sprawdzenie, czy nie jesteś botem, przed pokazaniem numeru telefonu',
              'Prawnie uzasadniony interes (zabezpieczenie funkcji, o którą prosisz)',
              'Cloudflare. Ładowane dopiero po kliknięciu „Pokaż numer”; API wysyła wtedy Twój adres IP do Cloudflare w celu weryfikacji.',
              'Zgodnie z zasadami Cloudflare',
            ],
            [
              'Adres IP',
              'Ograniczanie liczby żądań w celu ochrony przed nadużyciami',
              'Prawnie uzasadniony interes',
              'API trzyma go wyłącznie w pamięci; aplikacja nigdy nie zapisuje go na dysku ani w logach. Jest też wysyłany do Cloudflare, gdy odsłaniasz numer telefonu (patrz wyżej).',
              'Okno najwyżej 24 godzin; znika po restarcie',
            ],
            [
              'Dane techniczne żądań: adres IP, user agent przeglądarki, żądany adres URL, czas',
              'Dostarczanie strony i API oraz ich ochrona',
              'Prawnie uzasadniony interes',
              'Cloudflare (strona) i Railway (API), jako podmioty przetwarzające',
              'Zgodnie z okresem przechowywania logów u dostawców',
            ],
            [
              'Cookie „lang”',
              'Zapamiętanie wybranego języka',
              'Niezbędne (o to prosisz)',
              'Twoja przeglądarka',
              '1 rok',
            ],
            [
              '„jl-cookies” (local storage)',
              'Zapamiętanie Twojego wyboru dotyczącego cookies',
              'Niezbędne',
              'Twoja przeglądarka',
              'Do czasu zmiany wyboru',
            ],
            [
              'Cookies i identyfikatory Google Analytics 4',
              'Statystyki odwiedzin',
              'Zgoda („Akceptuję”)',
              'Google (USA)',
              // OWNER-PLACEHOLDER (GA4 retention)
              'Zgodnie z ustawieniami usługi GA4, ustawionymi na najkrótszy dostępny okres [WŁAŚCICIEL: potwierdź]',
            ],
            [
              'PostHog, za zgodą',
              'Analityka produktowa',
              'Zgoda („Akceptuję”)',
              'Chmura PostHog w UE',
              'Zgodnie z ustawieniami projektu PostHog',
            ],
            [
              'Bezcookiesowe zliczanie PostHog po wyborze „Tylko niezbędne”',
              'Zliczanie odwiedzin zbiorczo, bez zapisywania czegokolwiek na Twoim urządzeniu',
              'Prawnie uzasadniony interes',
              'Chmura PostHog w UE (skrót liczony po stronie serwera)',
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
          text: 'O publikacji wpisu w księdze gości decydują automatycznie proste reguły tekstowe oraz opisane niżej kontrole OpenAI. Nie ma to wobec Ciebie skutków prawnych. Jeśli się z tym nie zgadzasz, napisz na adres podany wyżej.',
        },
      ],
    },
    {
      id: 'recipients',
      heading: 'Kto jeszcze przetwarza dane',
      blocks: [
        {
          type: 'p',
          text: 'Ci dostawcy przetwarzają dane w celach wskazanych w tabeli wyżej. Przekazanie danych poza EOG opiera się na zabezpieczeniach oferowanych przez dostawcę zgodnie z rozdziałem V RODO.',
        },
        { type: 'h3', text: 'Cloudflare' },
        {
          type: 'p',
          text: 'Hostuje i dostarcza stronę, ustawia cookie „lang” i, jak każdy hosting, przetwarza dane techniczne każdego żądania (adres IP, user agent przeglądarki, żądany adres URL, czas). Cloudflare Turnstile, czyli kontrola antybotowa, ładuje się dopiero po kliknięciu „Pokaż numer”, aby odsłonić numer telefonu.',
        },
        { type: 'h3', text: 'Railway' },
        {
          type: 'p',
          // OWNER-PLACEHOLDER (region)
          text: 'Hostuje API oraz jego bazę danych z księgą gości i przetwarza dane techniczne każdego żądania do API (adres IP, user agent przeglądarki, żądany adres URL, czas). Region: [WŁAŚCICIEL: region Railway].',
        },
        { type: 'h3', text: 'OpenAI' },
        {
          type: 'p',
          text: 'Treść wpisu w księdze gości trafia do OpenAI (Stany Zjednoczone) w ramach dwóch automatycznych kontroli: moderacji, której OpenAI nie przechowuje, oraz oceny przydatności, przechowywanej do 30 dni w celu monitorowania nadużyć. OpenAI nie używa tych danych do trenowania modeli. Twój adres IP nie jest wysyłany.',
        },
        { type: 'h3', text: 'Resend' },
        {
          type: 'p',
          text: 'Dostarcza wiadomość z formularza kontaktowego na moją skrzynkę. Przechodzą przez niego Twoje imię, adres e-mail i treść wiadomości.',
        },
        { type: 'h3', text: 'Google Analytics 4' },
        {
          type: 'p',
          text: 'Ładowany tylko wtedy, gdy klikniesz „Akceptuję” w komunikacie o cookies. Google (Stany Zjednoczone) otrzymuje dane o Twojej wizycie i ustawia swoje cookies analityczne.',
        },
        { type: 'h3', text: 'PostHog (UE)' },
        {
          type: 'p',
          text: 'Jeśli klikniesz „Akceptuję”, PostHog rejestruje Twoją wizytę z użyciem swoich cookies. Jeśli klikniesz „Tylko niezbędne”, jedynie zlicza wizyty zbiorczo za pomocą skrótu liczonego po stronie serwera, bez cookies i bez zapisu na Twoim urządzeniu. Do czasu dokonania wyboru nic nie robi.',
        },
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies i pamięć lokalna',
      blocks: [
        {
          type: 'p',
          text: 'Bez Twojej zgody używane są tylko dwa pierwsze wpisy. Jeśli wybierzesz „Tylko niezbędne”, nic więcej nie jest zapisywane. Wybór możesz zmienić w dowolnej chwili przez „Ustawienia cookies” w stopce; wycofanie zgody zatrzymuje Google Analytics, usuwa jego cookies i przełącza PostHog na zliczanie bez cookies.',
        },
        {
          type: 'table',
          caption: 'Cookies i pamięć przeglądarki',
          head: ['Nazwa', 'Cel', 'Kiedy powstaje', 'Czas trwania'],
          rows: [
            ['lang (cookie)', 'Wybrany przez Ciebie język', 'Używasz przełącznika języka', '1 rok'],
            [
              'jl-cookies (local storage)',
              'Twój wybór dotyczący cookies',
              'Odpowiadasz na komunikat o cookies',
              'Do czasu zmiany wyboru',
            ],
            [
              '_ga, _ga_* (cookies)',
              'Google Analytics',
              'Klikasz „Akceptuję”',
              'Zgodnie z ustawieniami GA4',
            ],
            [
              'Klucze PostHog (cookies i local storage)',
              'Analityka PostHog',
              'Klikasz „Akceptuję”',
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
