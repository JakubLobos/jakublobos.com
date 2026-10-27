import { CONSENT_KEY, createConsentStore, type ConsentStorage } from '../lib/consent.ts';

// Reading `localStorage` itself throws when site data is blocked; consent then lives for the page only.
function pageStorage(): ConsentStorage {
  try {
    return localStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined };
  }
}

/** The one consent store per page, shared by the banner and the analytics loader. */
export const consentStore = createConsentStore(pageStorage());

// A choice made in another tab applies here too (`key` is null when storage was cleared).
addEventListener('storage', ({ key }) => {
  if (key === CONSENT_KEY || key === null) consentStore.refresh();
});
