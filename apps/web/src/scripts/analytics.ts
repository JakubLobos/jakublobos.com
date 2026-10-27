import type { AnalyticsPorts } from '../lib/analytics/driver.ts';
import { consentStore } from './consent-store.ts';

// Build-time IDs. These checks stay inline and constant-foldable: with an ID unset or empty
// (development, tests) the bundler drops the provider's dynamic imports, so its chunks are not
// emitted at all. Don't wrap them in a helper.
const ga4Value: unknown = import.meta.env.PUBLIC_GA4_ID;
const ga4Id = typeof ga4Value === 'string' && ga4Value !== '' ? ga4Value : undefined;
const posthogValue: unknown = import.meta.env.PUBLIC_POSTHOG_KEY;
const posthogKey =
  typeof posthogValue === 'string' && posthogValue !== '' ? posthogValue : undefined;
const hostValue: unknown = import.meta.env.PUBLIC_POSTHOG_HOST;
const posthogHost =
  typeof hostValue === 'string' && hostValue !== '' ? hostValue : 'https://eu.i.posthog.com';

async function createPorts(): Promise<AnalyticsPorts> {
  const [ga4, posthog] = await Promise.all([
    ga4Id === undefined
      ? undefined
      : import('../lib/analytics/ga4.ts').then(({ createGa4, expireGaCookies }) =>
          createGa4(ga4Id, {
            dataLayer() {
              const existing: unknown = Reflect.get(window, 'dataLayer');
              const layer: unknown[] = Array.isArray(existing) ? existing : [];
              if (layer !== existing) Reflect.set(window, 'dataLayer', layer);
              return layer;
            },
            setDisabled(id, disabled) {
              Reflect.set(window, `ga-disable-${id}`, disabled);
            },
            injectScript(src) {
              const script = document.createElement('script');
              script.async = true;
              script.src = src;
              document.head.append(script);
            },
            clearCookies() {
              for (const expiry of expireGaCookies(document.cookie, location.hostname)) {
                document.cookie = expiry;
              }
            },
          }),
        ),
    posthogKey === undefined
      ? undefined
      : import('../lib/analytics/posthog.ts').then(({ createPostHog }) =>
          createPostHog({
            key: posthogKey,
            apiHost: posthogHost,
            // The slim build: page views only. Replay, surveys, flags and autocapture are not
            // bundled (autocapture alone would add about 58 KB gzip, see the T-032 r2 report).
            load: () => import('posthog-js/dist/module.slim'),
            clearSessionStorage() {
              try {
                for (const key of Object.keys(sessionStorage)) {
                  if (key.startsWith('ph_')) sessionStorage.removeItem(key);
                }
              } catch {
                // Blocked storage holds nothing to clear.
              }
            },
          }),
        ),
  ]);
  return { ga4, posthog };
}

async function start(): Promise<void> {
  const { createConsentDriver } = await import('../lib/analytics/driver.ts');
  const apply = createConsentDriver(await createPorts());
  apply(consentStore.get());
  consentStore.subscribe(apply);
}

if (ga4Id !== undefined || posthogKey !== undefined) {
  // Analytics must never compete with first paint or input.
  if ('requestIdleCallback' in window) requestIdleCallback(() => void start(), { timeout: 4000 });
  else setTimeout(() => void start(), 2000);
}
