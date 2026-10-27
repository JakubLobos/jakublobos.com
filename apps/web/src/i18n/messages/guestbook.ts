import { defineMessages } from '../t.ts';

// PL is a draft pending owner review (D-02). The eyebrow and labels are upper-cased here, not via
// CSS. `{n}` is replaced at runtime (lib/guestbook-form.ts).
export const guestbook = defineMessages({
  en: {
    eyebrow: 'GUESTBOOK',
    title: 'I love connecting people through the power of frontend',
    lastVisitor: 'THE LAST VISITOR SAID',
    loading: 'Loading the latest mark…',
    empty: 'No marks yet. Be the first to leave one!',
    loadError: 'Couldn’t load the latest mark right now.',
    retry: 'Try again',
    form: {
      label: 'Your message',
      placeholder: 'Leave your mark for the next visitor…',
      paintLegend: 'Pick your paint',
      submit: 'Leave a mark',
      sending: 'Sending…',
      honeypot: 'Leave empty',
      notice: 'Your message is reviewed before it appears. Please don’t include personal details.',
      privacy: 'Privacy',
      needsScript: 'Leaving a mark needs JavaScript.',
      charsLeft: '{n} characters left',
      limitReached: 'Character limit reached',
    },
    paint: {
      red: 'Red',
      coral: 'Coral',
      yellow: 'Yellow',
      purple: 'Purple',
      violet: 'Violet',
      blue: 'Blue',
    },
    fieldErrors: {
      required: 'Write a message first.',
      empty: 'Write a message first.',
      invalid: 'That message couldn’t be read. Please try again.',
      too_long: 'Please keep it to 120 characters.',
      invalid_characters: 'Some characters aren’t allowed. Please use plain text.',
      links_not_allowed: 'Links aren’t allowed here. Please leave a plain message.',
      contact_info_not_allowed: 'Please don’t include emails or phone numbers.',
    },
    submitErrors: {
      rateLimited: 'You’ve left a few marks already. Try again in a few minutes.',
      retry: 'Couldn’t send that right now. Please try again in a moment.',
    },
    modal: {
      close: 'Got it',
    },
    // Live review progress shown in the dialog after sending (ADR-0017). Reasons are deliberately vague.
    status: {
      checking: {
        eyebrow: 'CHECKING',
        title: 'Checking your note…',
        body: 'This usually takes a few seconds.',
      },
      approved: {
        eyebrow: 'LIVE',
        title: 'Your note is live!',
        body: 'It now greets the next visitor.',
      },
      rejected: {
        eyebrow: 'NOT PUBLISHED',
        title: 'Oh no… your note didn’t pass review.',
        reasons: {
          inappropriate: 'It doesn’t fit the tone of this site.',
          off_topic: 'It looks like a meme or isn’t about the site.',
          impersonation: 'Please don’t sign as the site’s author.',
          personal_data: 'Please leave out personal details.',
        },
      },
      superseded: {
        eyebrow: 'REPLACED',
        title: 'Someone was a little faster',
        body: 'A newer note arrived before yours was reviewed, and the newest one wins. Feel free to try again later!',
      },
      slow: {
        eyebrow: 'STILL CHECKING',
        title: 'This is taking longer than usual.',
        body: 'If your note is approved, it will appear on the site.',
      },
    },
  },
  pl: {
    eyebrow: 'KSIĘGA GOŚCI',
    title: 'Uwielbiam łączyć ludzi siłą frontendu',
    lastVisitor: 'OSTATNI GOŚĆ NAPISAŁ',
    loading: 'Wczytuję najnowszy wpis…',
    empty: 'Nie ma jeszcze wpisów. Zostaw pierwszy!',
    loadError: 'Nie udało się teraz wczytać najnowszego wpisu.',
    retry: 'Spróbuj ponownie',
    form: {
      label: 'Twoja wiadomość',
      placeholder: 'Zostaw ślad dla kolejnego gościa…',
      paintLegend: 'Wybierz kolor farby',
      submit: 'Zostaw ślad',
      sending: 'Wysyłanie…',
      honeypot: 'Zostaw puste',
      notice:
        'Wiadomość jest sprawdzana, zanim pojawi się na stronie. Nie podawaj danych osobowych.',
      privacy: 'Prywatność',
      needsScript: 'Zostawienie śladu wymaga JavaScriptu.',
      charsLeft: 'Zostało znaków: {n}',
      limitReached: 'Osiągnięto limit znaków',
    },
    paint: {
      red: 'Czerwony',
      coral: 'Koralowy',
      yellow: 'Żółty',
      purple: 'Purpurowy',
      violet: 'Fioletowy',
      blue: 'Niebieski',
    },
    fieldErrors: {
      required: 'Najpierw napisz wiadomość.',
      empty: 'Najpierw napisz wiadomość.',
      invalid: 'Nie udało się odczytać wiadomości. Spróbuj ponownie.',
      too_long: 'Zmieść się w 120 znakach.',
      invalid_characters: 'Niektóre znaki są niedozwolone. Użyj zwykłego tekstu.',
      links_not_allowed: 'Linki są tu niedozwolone. Zostaw zwykłą wiadomość.',
      contact_info_not_allowed: 'Nie podawaj adresów e-mail ani numerów telefonu.',
    },
    submitErrors: {
      rateLimited: 'Zostawiono już kilka wpisów. Spróbuj ponownie za kilka minut.',
      retry: 'Nie udało się teraz wysłać wiadomości. Spróbuj ponownie za chwilę.',
    },
    modal: {
      close: 'Rozumiem',
    },
    status: {
      checking: {
        eyebrow: 'SPRAWDZAM',
        title: 'Sprawdzam Twój wpis…',
        body: 'Zwykle zajmuje to kilka sekund.',
      },
      approved: {
        eyebrow: 'JUŻ NA STRONIE',
        title: 'Twój wpis jest już na stronie!',
        body: 'Wita teraz kolejnego gościa.',
      },
      rejected: {
        eyebrow: 'NIEOPUBLIKOWANY',
        title: 'Oj… Twój wpis nie przeszedł weryfikacji.',
        reasons: {
          inappropriate: 'Nie pasuje do charakteru tej strony.',
          off_topic: 'Wygląda na mema albo nie jest o tej stronie.',
          impersonation: 'Nie podpisuj się jako autor strony.',
          personal_data: 'Pomiń dane osobowe.',
        },
      },
      superseded: {
        eyebrow: 'ZASTĄPIONY',
        title: 'Ktoś był odrobinę szybszy',
        body: 'Zanim Twój wpis został sprawdzony, pojawił się nowszy, a wygrywa najnowszy. Spróbuj jeszcze raz później!',
      },
      slow: {
        eyebrow: 'WCIĄŻ SPRAWDZAM',
        title: 'To trwa dłużej niż zwykle.',
        body: 'Jeśli Twój wpis zostanie zatwierdzony, pojawi się na stronie.',
      },
    },
  },
});
