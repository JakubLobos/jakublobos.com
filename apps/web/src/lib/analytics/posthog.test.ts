import { describe, expect, it } from 'vitest';
import {
  createPostHog,
  type posthogOptions,
  type PostHogClient,
  type PostHogInstance,
} from './posthog.ts';

function setup({ alreadyOptedIn = false } = {}) {
  const events: string[] = [];
  let optedIn = alreadyOptedIn;
  const instance: PostHogInstance = {
    opt_in_capturing: () => {
      optedIn = true;
      events.push('opt_in');
    },
    opt_out_capturing: () => {
      optedIn = false;
      events.push('opt_out');
    },
    has_opted_in_capturing: () => optedIn,
  };
  let options: ReturnType<typeof posthogOptions> | undefined;
  let finishLoading: () => void = () => undefined;
  let loads = 0;

  const client: PostHogClient = {
    init(key, given) {
      events.push(`init:${key}`);
      options = given;
    },
  };
  const posthog = createPostHog({
    key: 'phc_test',
    apiHost: 'https://eu.i.posthog.com',
    load: () => {
      loads += 1;
      return new Promise((resolve) => {
        finishLoading = () => {
          resolve({ default: client });
        };
      });
    },
    clearSessionStorage: () => events.push('clear_session'),
  });

  /** Lets the SDK finish loading, then lets init call back as the real SDK does. */
  async function finishInit(): Promise<void> {
    finishLoading();
    await Promise.resolve();
    options?.loaded(instance);
  }

  return { posthog, events, finishInit, loads: () => loads, options: () => options };
}

describe('createPostHog', () => {
  it('loads and initialises nothing before a decision', () => {
    const { loads, events } = setup();
    expect(loads()).toBe(0);
    expect(events).toEqual([]);
  });

  it('initialises in cookieless on_reject mode, then opts in from the loaded callback', async () => {
    const { posthog, events, finishInit, options } = setup();
    posthog.optIn();
    await finishInit();

    expect(events).toEqual(['init:phc_test', 'opt_in']);
    expect(options()).toMatchObject({
      api_host: 'https://eu.i.posthog.com',
      cookieless_mode: 'on_reject',
      opt_out_capturing_by_default: true,
      advanced_disable_flags: true,
      autocapture: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
    });
  });

  it('does not opt in again for a visitor who already is, so no extra $opt_in per page', async () => {
    const { posthog, events, finishInit } = setup({ alreadyOptedIn: true });
    posthog.optIn();
    await finishInit();
    expect(events).toEqual(['init:phc_test']);
  });

  it('leaves a first-time "Only essential" visitor unstored: the SDK default already counts cookielessly', async () => {
    const { posthog, events, finishInit } = setup();
    posthog.optOut();
    await finishInit();
    expect(events).toEqual(['init:phc_test']);
  });

  it('withdraws a stored opt-in on reload and clears the SDK session keys', async () => {
    const { posthog, events, finishInit } = setup({ alreadyOptedIn: true });
    posthog.optOut();
    await finishInit();
    expect(events).toEqual(['init:phc_test', 'opt_out', 'clear_session']);
  });

  it('applies only the latest decision when it flips during loading, without a second load', async () => {
    const { posthog, events, finishInit, loads } = setup();
    posthog.optOut();
    posthog.optIn();
    await finishInit();

    expect(loads()).toBe(1);
    expect(events).toEqual(['init:phc_test', 'opt_in']);
  });

  it('does not capture when "Accept" flips to "Only essential" while loading', async () => {
    const { posthog, events, finishInit } = setup();
    posthog.optIn();
    posthog.optOut();
    await finishInit();
    expect(events).toEqual(['init:phc_test']);
  });

  it('applies later decisions directly on the initialised instance', async () => {
    const { posthog, events, finishInit, loads } = setup();
    posthog.optIn();
    await finishInit();
    posthog.optOut();
    posthog.optIn();

    expect(loads()).toBe(1);
    expect(events).toEqual(['init:phc_test', 'opt_in', 'opt_out', 'clear_session', 'opt_in']);
  });

  it('retries after a failed load on the next decision', async () => {
    let attempts = 0;
    const posthog = createPostHog({
      key: 'k',
      apiHost: 'h',
      load: () => {
        attempts += 1;
        return Promise.reject(new Error('offline'));
      },
      clearSessionStorage: () => undefined,
    });
    posthog.optIn();
    await Promise.resolve();
    await Promise.resolve();
    posthog.optIn();
    expect(attempts).toBe(2);
  });
});
