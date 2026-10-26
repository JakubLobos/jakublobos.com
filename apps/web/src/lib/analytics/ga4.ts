import type { Ga4Port } from './driver.ts';

/** The browser surface the adapter needs, injected so the logic stays DOM-free. */
export interface Ga4Host {
  /** `window.dataLayer`, created on first use. */
  dataLayer(): unknown[];
  /** Sets Google's documented `window['ga-disable-<ID>']` opt-out switch. */
  setDisabled(measurementId: string, disabled: boolean): void;
  injectScript(src: string): void;
  /** Expires the Google cookies left on the page and its parent domains. */
  clearCookies(): void;
}

const GTAG_ORIGIN = 'https://www.googletagmanager.com/gtag/js';

/**
 * GA4 through gtag.js directly (no Tag Manager). `load` runs only after "Accept"; the config
 * call lives here in bundled code so the CSP needs no inline script.
 *
 * Withdrawal uses Google's `ga-disable-<ID>` switch instead of a reload: it stops every
 * further hit immediately, and a later "Accept" flips it back and re-issues `config` (the
 * script itself is injected only once).
 */
export function createGa4(measurementId: string, host: Ga4Host): Ga4Port {
  let injected = false;

  // gtag.js recognises commands only as `arguments` objects, never as arrays, hence the
  // classic function and the rest-parameter exemption.
  function gtag(..._command: unknown[]): void {
    // eslint-disable-next-line prefer-rest-params
    host.dataLayer().push(arguments);
  }

  return {
    load() {
      host.setDisabled(measurementId, false);
      if (!injected) gtag('js', new Date());
      gtag('config', measurementId, { anonymize_ip: true });
      if (injected) return;
      injected = true;
      host.injectScript(`${GTAG_ORIGIN}?id=${encodeURIComponent(measurementId)}`);
    },
    unload() {
      host.setDisabled(measurementId, true);
      host.clearCookies();
    },
  };
}

const GA_COOKIE = /^(?:_ga|_gid|_gat(?:_.+)?|_ga_.+)$/;

/**
 * `Set-Cookie`-style expiry strings (for `document.cookie = …`) for every Google Analytics
 * cookie in `cookieHeader`. GA picks the highest parent domain it may write to, so each
 * cookie is expired on the host and on every parent domain below the TLD; a browser ignores
 * the attempts that don't match where the cookie lives.
 */
export function expireGaCookies(cookieHeader: string, hostname: string): string[] {
  const names = cookieHeader
    .split(';')
    .map((pair) => pair.split('=')[0]?.trim() ?? '')
    .filter((name) => GA_COOKIE.test(name));

  const labels = hostname.split('.');
  const domains = labels.slice(0, -1).map((_, index) => labels.slice(index).join('.'));

  return names.flatMap((name) => [
    `${name}=; Max-Age=0; Path=/`,
    ...domains.map((domain) => `${name}=; Max-Age=0; Path=/; Domain=${domain}`),
  ]);
}
