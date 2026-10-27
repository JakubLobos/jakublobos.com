// Analytics consent state (ADR-0011). Values and key are the design prototype's own, so a
// choice made on an earlier build keeps working.
export type ConsentChoice = 'all' | 'essential';
export type ConsentState = 'unknown' | ConsentChoice;

export const CONSENT_KEY = 'jl-cookies';

export interface ConsentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type ConsentListener = (state: ConsentState) => void;

export interface ConsentStore {
  get(): ConsentState;
  set(choice: ConsentChoice): void;
  /** Re-reads storage, for changes made by another tab. Notifies only when the state differs. */
  refresh(): void;
  /** Returns the unsubscribe function. Listeners are not called on subscription. */
  subscribe(listener: ConsentListener): () => void;
}

function isChoice(value: string | null): value is ConsentChoice {
  return value === 'all' || value === 'essential';
}

/** Anything unreadable or unrecognised (blocked storage, stale or tampered value) is `unknown`. */
export function readConsent(storage: ConsentStorage): ConsentState {
  try {
    const stored = storage.getItem(CONSENT_KEY);
    return isChoice(stored) ? stored : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Returns whether the choice was persisted; the in-memory store state is updated either way. */
export function writeConsent(storage: ConsentStorage, choice: ConsentChoice): boolean {
  try {
    storage.setItem(CONSENT_KEY, choice);
    return true;
  } catch {
    return false;
  }
}

export function createConsentStore(storage: ConsentStorage): ConsentStore {
  let state = readConsent(storage);
  const listeners = new Set<ConsentListener>();

  function update(next: ConsentState): void {
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) listener(state);
  }

  return {
    get: () => state,
    set(choice) {
      writeConsent(storage, choice);
      update(choice);
    },
    refresh() {
      update(readConsent(storage));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
