const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** The fake verifier (`HUMAN_VERIFIER=fake`, local development only) accepts exactly this token. */
const FAKE_TOKEN = 'pass';
/** A visitor needs time for an interactive challenge, but not forever. */
const TOKEN_TIMEOUT_MS = 60_000;

interface TurnstileOptions {
  sitekey: string;
  action: string;
  execution: 'execute';
  appearance: 'interaction-only';
  language: string;
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
  'timeout-callback': () => void;
}

interface Turnstile {
  render: (container: HTMLElement, options: TurnstileOptions) => string | undefined;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: unknown;
  }
}

function isTurnstile(value: unknown): value is Turnstile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'render' in value &&
    typeof value.render === 'function' &&
    'execute' in value &&
    typeof value.execute === 'function' &&
    'remove' in value &&
    typeof value.remove === 'function'
  );
}

let loading: Promise<Turnstile> | null = null;

/** Third-party code is fetched only here, on the visitor's click (ADR-0015). */
function loadTurnstile(): Promise<Turnstile> {
  if (loading) return loading;
  const promise = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.addEventListener('load', () => {
      if (isTurnstile(window.turnstile)) resolve(window.turnstile);
      else reject(new Error('Turnstile did not initialise'));
    });
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error('Turnstile failed to load'));
    });
    document.head.append(script);
  });
  loading = promise;
  // A blocked or failed load must be retryable on the next click.
  promise.catch(() => {
    if (loading === promise) loading = null;
  });
  return promise;
}

export interface TokenRequest {
  /** Where an interactive challenge, if Cloudflare asks for one, is shown. */
  readonly widget: HTMLElement;
  /** Empty (local development) switches to the fake flow. */
  readonly siteKey: string;
  readonly language: string;
  /** Must match the API route's expected action, or the token is rejected. */
  readonly action: string;
}

/** One challenge per call: the token is single-use, so every retry renders and executes anew. */
export async function obtainToken({
  widget,
  siteKey,
  language,
  action,
}: TokenRequest): Promise<string> {
  if (siteKey === '') return FAKE_TOKEN;
  const turnstile = await loadTurnstile();

  return new Promise<string>((resolve, reject) => {
    // The callbacks below run after `render` returns, so they read the id and timer from here.
    const challenge: { id?: string | undefined; timer?: ReturnType<typeof setTimeout> } = {};
    const settle = (finish: () => void) => {
      clearTimeout(challenge.timer);
      if (challenge.id !== undefined) turnstile.remove(challenge.id);
      widget.replaceChildren();
      finish();
    };
    const fail = () => {
      settle(() => {
        reject(new Error('Turnstile challenge failed'));
      });
    };

    challenge.timer = setTimeout(fail, TOKEN_TIMEOUT_MS);
    challenge.id = turnstile.render(widget, {
      sitekey: siteKey,
      action,
      execution: 'execute',
      appearance: 'interaction-only',
      language,
      callback: (token) => {
        settle(() => {
          resolve(token);
        });
      },
      'error-callback': fail,
      'expired-callback': fail,
      'timeout-callback': fail,
    });
    if (challenge.id === undefined) fail();
    else turnstile.execute(challenge.id);
  });
}
