import { describe, expect, it, vi } from 'vitest';
import {
  CONSENT_KEY,
  createConsentStore,
  readConsent,
  writeConsent,
  type ConsentStorage,
} from './consent.ts';

function memoryStorage(initial?: string): ConsentStorage & { value: string | null } {
  const storage = {
    value: initial ?? null,
    getItem: () => storage.value,
    setItem: (_key: string, value: string) => {
      storage.value = value;
    },
  };
  return storage;
}

const blockedStorage: ConsentStorage = {
  getItem: () => {
    throw new DOMException('blocked', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('blocked', 'SecurityError');
  },
};

describe('readConsent', () => {
  it.each(['all', 'essential'] as const)('accepts %s', (value) => {
    expect(readConsent(memoryStorage(value))).toBe(value);
  });

  it.each([undefined, '', 'ask', 'ALL', 'true', '{"all":1}'])('treats %j as unknown', (value) => {
    expect(readConsent(memoryStorage(value))).toBe('unknown');
  });

  it('treats unreadable storage as unknown', () => {
    expect(readConsent(blockedStorage)).toBe('unknown');
  });
});

describe('writeConsent', () => {
  it('persists under the prototype key', () => {
    const setItem = vi.fn();
    expect(writeConsent({ getItem: () => null, setItem }, 'essential')).toBe(true);
    expect(setItem).toHaveBeenCalledWith(CONSENT_KEY, 'essential');
  });

  it('reports blocked storage instead of throwing', () => {
    expect(writeConsent(blockedStorage, 'all')).toBe(false);
  });
});

describe('createConsentStore', () => {
  it('persists, updates and notifies on set', () => {
    const storage = memoryStorage();
    const store = createConsentStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set('all');
    expect(storage.value).toBe('all');
    expect(store.get()).toBe('all');
    expect(listener).toHaveBeenCalledExactlyOnceWith('all');
  });

  it('does not notify when the choice is unchanged', () => {
    const store = createConsentStore(memoryStorage('all'));
    const listener = vi.fn();
    store.subscribe(listener);
    store.set('all');
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps the choice for the session when storage is blocked', () => {
    const store = createConsentStore(blockedStorage);
    store.set('essential');
    expect(store.get()).toBe('essential');
  });

  it('picks up another tab through refresh, including a cleared value', () => {
    const storage = memoryStorage();
    const store = createConsentStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);

    storage.value = 'essential';
    store.refresh();
    storage.value = null;
    store.refresh();
    store.refresh();

    expect(listener.mock.calls).toEqual([['essential'], ['unknown']]);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createConsentStore(memoryStorage());
    const listener = vi.fn();
    store.subscribe(listener)();
    store.set('all');
    expect(listener).not.toHaveBeenCalled();
  });
});
