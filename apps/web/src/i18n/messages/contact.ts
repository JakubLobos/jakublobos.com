import { defineMessages } from '../t.ts';

// PL is a draft pending owner review (D-02). Eyebrow and labels are upper-cased here, not via CSS.
// EN field errors are the prototype's exact copy; their keys are the contract's FieldErrorCodes.
export const contactMessages = defineMessages({
  en: {
    eyebrow: 'CONTACT',
    title: 'Let’s build something',
    lead: 'Have a project, a role or a question? Send me a message.',
    details: {
      email: 'EMAIL',
      phone: 'PHONE',
      github: 'GITHUB',
      linkedin: 'LINKEDIN',
      languages: 'LANGUAGES',
    },
    phone: {
      show: 'Show number',
      verifying: 'Verifying…',
      failed: 'Couldn’t verify. Try again.',
      revealed: 'Phone number shown.',
      noScript: 'Email me instead.',
    },
    form: {
      label: 'Contact form',
      noScript: 'This form needs JavaScript. Please email me instead.',
      name: { label: 'YOUR NAME', placeholder: 'Jane Doe' },
      email: { label: 'EMAIL', placeholder: 'jane@company.com' },
      message: { label: 'MESSAGE', placeholder: 'Tell me a bit about your idea…' },
      trap: 'Leave this field empty',
      submit: 'Send message',
      sending: 'Sending…',
      sent: 'Message sent',
      sendAnother: 'Send another',
      statusSending: 'Sending your message…',
      statusSent: 'Thanks! I’ll get back to you at {email}.',
      failure: 'Couldn’t send your message right now. Please try again, or email me directly.',
      rateLimited: 'Too many messages. Please try again later.',
      notice: 'Your details are only used to reply to your message.',
      privacy: 'Privacy policy',
    },
    errors: {
      name: {
        too_short: 'Please tell me your name.',
        too_long: 'That name is a bit long (max. 60 characters).',
        invalid_characters: 'Please use plain text only.',
      },
      email: {
        required: 'I need your email to reply.',
        invalid: 'That email doesn’t look quite right.',
        too_long: 'That email is too long (max. 120 characters).',
      },
      message: {
        too_short: 'A few more words, please (min. 10 characters).',
        too_long: 'That’s a bit long (max. 1000 characters).',
        invalid_characters: 'Please remove unsupported characters.',
      },
    },
  },
  pl: {
    eyebrow: 'KONTAKT',
    title: 'Zbudujmy coś razem',
    lead: 'Masz projekt, ofertę pracy lub pytanie? Napisz do mnie.',
    details: {
      email: 'E-MAIL',
      phone: 'TELEFON',
      github: 'GITHUB',
      linkedin: 'LINKEDIN',
      languages: 'JĘZYKI',
    },
    phone: {
      show: 'Pokaż numer',
      verifying: 'Weryfikuję…',
      failed: 'Nie udało się zweryfikować. Spróbuj ponownie.',
      revealed: 'Numer telefonu został wyświetlony.',
      noScript: 'Napisz do mnie e-mailem.',
    },
    form: {
      label: 'Formularz kontaktowy',
      noScript: 'Ten formularz wymaga JavaScriptu. Napisz do mnie e-mailem.',
      name: { label: 'TWOJE IMIĘ', placeholder: 'Jan Kowalski' },
      email: { label: 'E-MAIL', placeholder: 'jan@firma.pl' },
      message: { label: 'WIADOMOŚĆ', placeholder: 'Opowiedz mi o swoim pomyśle…' },
      trap: 'Zostaw to pole puste',
      submit: 'Wyślij wiadomość',
      sending: 'Wysyłanie…',
      sent: 'Wiadomość wysłana',
      sendAnother: 'Wyślij kolejną',
      statusSending: 'Wysyłam Twoją wiadomość…',
      statusSent: 'Dziękuję! Odpowiem na adres {email}.',
      failure:
        'Nie udało się teraz wysłać wiadomości. Spróbuj ponownie lub napisz do mnie bezpośrednio.',
      rateLimited: 'Zbyt wiele wiadomości. Spróbuj ponownie później.',
      notice: 'Twoje dane posłużą wyłącznie do odpowiedzi na wiadomość.',
      privacy: 'Polityka prywatności',
    },
    errors: {
      name: {
        too_short: 'Podaj, proszę, swoje imię.',
        too_long: 'To imię jest za długie (maks. 60 znaków).',
        invalid_characters: 'Użyj, proszę, zwykłego tekstu.',
      },
      email: {
        required: 'Potrzebuję Twojego adresu e-mail, żeby odpowiedzieć.',
        invalid: 'Ten adres e-mail wygląda nieprawidłowo.',
        too_long: 'Ten adres e-mail jest za długi (maks. 120 znaków).',
      },
      message: {
        too_short: 'Napisz, proszę, trochę więcej (min. 10 znaków).',
        too_long: 'Wiadomość jest za długa (maks. 1000 znaków).',
        invalid_characters: 'Usuń, proszę, nieobsługiwane znaki.',
      },
    },
  },
});
