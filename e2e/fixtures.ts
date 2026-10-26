import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page, type Response } from '@playwright/test';

const FIRST_PARTY_ORIGINS: ReadonlySet<string> = new Set([
  'http://localhost:8787',
  'http://localhost:3000',
]);

// Third-party hosts the site may legitimately load after consent (GA4, PostHog, Turnstile).
// They are fulfilled locally so no spec ever reaches the real network.
const STUBBED_HOST_SUFFIXES = [
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'posthog.com',
  'challenges.cloudflare.com',
];

function isStubbedHost(hostname: string): boolean {
  return STUBBED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

interface BrowserWithReporter {
  __reportCsp: (detail: string) => void;
}

interface Options {
  /** Console errors matching any of these are expected by the spec (for example a mocked 500). */
  ignoredConsoleErrors: RegExp[];
}

/**
 * `test` with guards on every page: fails on console errors, uncaught exceptions, CSP
 * violations, and requests to any host other than the site and the API.
 */
export const test = base.extend<Options>({
  ignoredConsoleErrors: [[], { option: true }],

  page: async ({ page, context, ignoredConsoleErrors }, use) => {
    const problems: string[] = [];

    page.on('console', (message) => {
      const text = message.text();
      if (
        message.type() === 'error' &&
        !ignoredConsoleErrors.some((pattern) => pattern.test(text))
      ) {
        problems.push(`console.error: ${text}`);
      }
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));

    await page.exposeFunction('__reportCsp', (detail: string) => {
      problems.push(`CSP violation: ${detail}`);
    });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        const report = (window as unknown as BrowserWithReporter).__reportCsp;
        report(`${event.violatedDirective} blocked ${event.blockedURI || 'inline'}`);
      });
    });

    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (FIRST_PARTY_ORIGINS.has(url.origin)) {
        await route.fallback();
      } else if (isStubbedHost(url.hostname)) {
        await (request.resourceType() === 'script'
          ? route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
          : route.fulfill({ status: 204 }));
      } else {
        problems.push(
          `unexpected external request: ${request.method()} ${url.origin}${url.pathname}`,
        );
        await route.abort('blockedbyclient');
      }
    });

    await use(page);

    expect(problems, 'browser-level problems (console, CSP, network)').toEqual([]);
  },
});

export { expect };

export type Locale = 'en' | 'pl';

/** Navigates to a site path in the given locale (`/privacy` -> `/pl/privacy`) and returns the response. */
export async function gotoLocale(page: Page, locale: Locale, path = '/'): Promise<Response> {
  const target = locale === 'en' ? path : path === '/' ? '/pl' : `/pl${path}`;
  const response = await page.goto(target);
  if (response === null) throw new Error(`navigation to ${target} produced no response`);
  return response;
}

interface A11yOptions {
  /** Limit the scan to this selector. */
  include?: string;
  exclude?: string[];
  /** Rule IDs to skip; every use needs a comment explaining why. */
  disableRules?: string[];
}

/** Fails on any serious or critical axe violation (WCAG 2.0/2.1/2.2 A and AA). */
export async function expectNoA11yViolations(page: Page, options: A11yOptions = {}): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
  ]);
  if (options.include !== undefined) builder = builder.include(options.include);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  if (options.disableRules !== undefined) builder = builder.disableRules(options.disableRules);

  const { violations } = await builder.analyze();
  const blocking = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }));
  expect(blocking, `serious/critical axe violations on ${page.url()}`).toEqual([]);
}
