import { defineMessages } from '../t.ts';

// Keys match the non-validation `kind`s of ApiResult (lib/api/client.ts).
export const errors = defineMessages({
  en: {
    network: 'Could not reach the server. Check your connection and try again.',
    unavailable: 'The service is temporarily unavailable. Please try again in a moment.',
    rate_limited: 'Too many attempts. Please wait a moment and try again.',
    unexpected: 'Something went wrong. Please try again.',
  },
  pl: {
    network: 'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.',
    unavailable: 'Usługa jest chwilowo niedostępna. Spróbuj ponownie za moment.',
    rate_limited: 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.',
    unexpected: 'Coś poszło nie tak. Spróbuj ponownie.',
  },
});
