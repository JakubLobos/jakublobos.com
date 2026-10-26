import type { ConsentState } from '../consent.ts';

export interface Ga4Port {
  load(): void;
  unload(): void;
}

export interface PostHogPort {
  optIn(): void;
  optOut(): void;
}

export interface AnalyticsPorts {
  /** Absent when the provider has no ID (development, tests): the driver then ignores it. */
  readonly ga4?: Ga4Port | undefined;
  readonly posthog?: PostHogPort | undefined;
}

/**
 * Applies the consent to provider table of ADR-0011. The driver starts at `unknown`, where
 * nothing is loaded or initialised; only a decision moves providers.
 */
export function createConsentDriver(ports: AnalyticsPorts): (state: ConsentState) => void {
  let current: ConsentState = 'unknown';

  return (next) => {
    if (next === current) return;
    const previous = current;
    current = next;

    if (next === 'all') {
      ports.ga4?.load();
      ports.posthog?.optIn();
      return;
    }

    // Leaving `all` is a withdrawal, whether the visitor chose "Only essential" or the stored
    // value vanished (another tab cleared it). PostHog then counts cookielessly at most.
    if (previous === 'all') ports.ga4?.unload();
    if (next === 'essential' || previous === 'all') ports.posthog?.optOut();
  };
}
