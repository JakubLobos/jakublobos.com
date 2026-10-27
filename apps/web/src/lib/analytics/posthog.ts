import type { PostHog, PostHogConfig } from 'posthog-js';
import type { PostHogPort } from './driver.ts';

export type PostHogInstance = Pick<
  PostHog,
  'opt_in_capturing' | 'opt_out_capturing' | 'has_opted_in_capturing'
>;

/** Builds the init options. The `satisfies` check pins every name to the installed version. */
export function posthogOptions(apiHost: string, loaded: (instance: PostHogInstance) => void) {
  return {
    api_host: apiHost,
    // Nothing is stored or sent until opt-in, or opt-out (then: cookieless hashed counting).
    cookieless_mode: 'on_reject',
    // An undecided SDK then counts as rejected, so "Only essential" is cookieless counting
    // without PostHog writing even its opt-out flag to storage (see `apply`).
    opt_out_capturing_by_default: true,
    loaded,
    // The slim build bundles no autocapture; this keeps it that way, so no click, input value or
    // form submission is ever captured. Page views are what the site counts.
    autocapture: false,
    // Everything that would load a second script or phone home for config the site doesn't use.
    disable_external_dependency_loading: true,
    disable_session_recording: true,
    disable_surveys: true,
    disable_conversations: true,
    disable_web_experiments: true,
    advanced_disable_flags: true,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    rageclick: false,
    // Nobody is identified, so no person profiles are needed.
    person_profiles: 'identified_only',
  } satisfies Partial<PostHogConfig>;
}

export interface PostHogClient {
  init(key: string, options: ReturnType<typeof posthogOptions>): unknown;
}

export interface PostHogSetup {
  key: string;
  apiHost: string;
  /** Dynamic import of the slim SDK, so it stays a lazy chunk. */
  load: () => Promise<{ default: PostHogClient }>;
  /** Removes PostHog's leftover session keys when consent is withdrawn. */
  clearSessionStorage: () => void;
}

/**
 * The first opt call lazily loads and initialises PostHog, so nothing runs before a decision.
 * The decision is applied from `loaded`, once initialisation is complete: a choice that flips
 * while the SDK is still loading just replaces the pending one, which avoids the refusal-during-load
 * race where PostHog starts capturing anyway (ADR-0011).
 */
export function createPostHog({
  key,
  apiHost,
  load,
  clearSessionStorage,
}: PostHogSetup): PostHogPort {
  let wanted: 'in' | 'out' | undefined;
  let instance: PostHogInstance | undefined;
  let starting = false;

  function apply(): void {
    if (instance === undefined) return;
    const optedIn = instance.has_opted_in_capturing();
    // Every opt-in call captures an `$opt_in` event, so a returning visitor must not repeat it.
    if (wanted === 'in' && !optedIn) instance.opt_in_capturing();
    // A visitor who never opted in is already counted cookielessly (`opt_out_capturing_by_default`);
    // opt_out_capturing() would only add a storage entry, so it runs when consent is withdrawn.
    else if (wanted === 'out' && optedIn) {
      instance.opt_out_capturing();
      // The SDK leaves its window-id keys behind; they are never sent, but a withdrawal means none.
      clearSessionStorage();
    }
  }

  function request(decision: 'in' | 'out'): void {
    wanted = decision;
    if (instance !== undefined) {
      apply();
      return;
    }
    if (starting) return;
    starting = true;
    load().then(
      ({ default: posthog }) => {
        posthog.init(
          key,
          posthogOptions(apiHost, (ready) => {
            instance = ready;
            apply();
          }),
        );
      },
      () => {
        // Offline or blocked: analytics simply stay off; the next decision may try again.
        starting = false;
      },
    );
  }

  return {
    optIn() {
      request('in');
    },
    optOut() {
      request('out');
    },
  };
}
