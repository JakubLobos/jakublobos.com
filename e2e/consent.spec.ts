import { gunzipSync } from 'node:zlib';
import { expect, expectNoA11yViolations, gotoLocale, test } from './fixtures.ts';
import type { Locale } from './fixtures.ts';
import { SITE } from './ports.ts';
import type { Page, Request } from '@playwright/test';

// Page animations are not what is tested here, and they make screenshots and axe flaky.
test.use({ reducedMotion: 'reduce' });

// PostHog drops every event from automated browsers (it reads navigator.webdriver and the
// "HeadlessChrome" brand), which would leave nothing to observe. Present a regular browser.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
  });
});

const GOOGLE = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com)$/;
const POSTHOG = /(^|\.)posthog\.com$/;

interface Traffic {
  google: Request[];
  posthog: Request[];
}

function watchTraffic(page: Page): Traffic {
  const traffic: Traffic = { google: [], posthog: [] };
  page.on('request', (request) => {
    const { hostname } = new URL(request.url());
    if (GOOGLE.test(hostname)) traffic.google.push(request);
    if (POSTHOG.test(hostname)) traffic.posthog.push(request);
  });
  return traffic;
}

/** PostHog posts gzip-compressed JSON; returns what all its requests carried, decoded. */
function posthogPayloads(requests: Request[]): string {
  return requests
    .map((request) => {
      const body = request.postDataBuffer();
      if (body === null) return '';
      try {
        return gunzipSync(body).toString('utf8');
      } catch {
        return body.toString('utf8');
      }
    })
    .join('\n');
}

async function bannerShown(page: Page) {
  const banner = page.getByRole('region', { name: /cookie consent|zgoda na pliki cookie/i });
  await expect(banner).toBeVisible();
  return banner;
}

/** Everything the page may have stored on the visitor's device for analytics. */
async function analyticsStorage(page: Page): Promise<string[]> {
  const keys = await page.evaluate(() => [
    ...Object.keys(localStorage),
    ...Object.keys(sessionStorage),
    ...document.cookie.split(';').map((pair) => pair.split('=')[0]?.trim() ?? ''),
  ]);
  return keys.filter((key) => /^(ph_|__ph_|_ga|_gid|ph\.|posthog)/i.test(key));
}

/**
 * Waits until analytics.ts has had its turn: an idle callback queued now runs after the one it
 * queued at load; WebKit has none, and analytics.ts falls back to a 2 s timer there.
 */
async function settleAnalyticsStartup(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const done = () => {
        resolve(null);
      };
      if ('requestIdleCallback' in window) requestIdleCallback(done, { timeout: 5000 });
      else setTimeout(done, 2500);
    });
  });
  await page.waitForLoadState('networkidle');
}

test.describe('consent: before a choice', () => {
  test('shows the banner without taking focus and sends nothing to analytics', async ({ page }) => {
    const traffic = watchTraffic(page);
    await gotoLocale(page, 'en');
    const banner = await bannerShown(page);

    await expect(banner.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);

    await settleAnalyticsStartup(page);
    expect(traffic.google).toEqual([]);
    expect(traffic.posthog).toEqual([]);
    expect(await analyticsStorage(page)).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('jl-cookies'))).toBeNull();
  });

  for (const locale of ['en', 'pl'] as const satisfies readonly Locale[]) {
    test(`${locale}: the banner is accessible`, async ({ page }) => {
      await gotoLocale(page, locale);
      await bannerShown(page);
      await expectNoA11yViolations(page);
    });
  }

  test('is hidden while the mobile menu is open', async ({ page }) => {
    await gotoLocale(page, 'en');
    const banner = await bannerShown(page);
    await page.evaluate(() => {
      document.documentElement.dataset.menuOpen = '';
    });
    await expect(banner).toBeHidden();
    await page.evaluate(() => {
      delete document.documentElement.dataset.menuOpen;
    });
    await expect(banner).toBeVisible();
  });
});

test.describe('consent: "Only essential"', () => {
  test('counts cookielessly: no Google, no stored identifiers', async ({ page }) => {
    const traffic = watchTraffic(page);
    await gotoLocale(page, 'en');
    const banner = await bannerShown(page);

    await banner.getByRole('button', { name: 'Only essential' }).click();
    await expect(banner).toBeHidden();
    await expect.poll(() => traffic.posthog.length).toBeGreaterThan(0);
    await settleAnalyticsStartup(page);

    expect(traffic.google).toEqual([]);
    expect(await analyticsStorage(page)).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('jl-cookies'))).toBe('essential');
    // Cookieless events carry PostHog's marker instead of a visitor identifier.
    expect(posthogPayloads(traffic.posthog)).toContain('$cookieless_mode');
  });

  test('is remembered: no banner on reload, PostHog still cookieless', async ({ page }) => {
    const traffic = watchTraffic(page);
    await gotoLocale(page, 'en');
    await (await bannerShown(page)).getByRole('button', { name: 'Only essential' }).click();

    await page.reload();
    await expect.poll(() => traffic.posthog.length).toBeGreaterThan(0);
    // The banner would appear 900 ms after load; there is no event to wait on for its absence.
    await page.waitForTimeout(1200);
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden();
    expect(traffic.google).toEqual([]);
    expect(await analyticsStorage(page)).toEqual([]);
  });
});

test.describe('consent: "Accept"', () => {
  test('loads gtag.js and opts PostHog in', async ({ page }) => {
    const traffic = watchTraffic(page);
    await gotoLocale(page, 'en');
    const banner = await bannerShown(page);

    await banner.getByRole('button', { name: 'Accept' }).click();
    await expect(banner).toBeHidden();

    await expect
      .poll(() => traffic.google.map((request) => request.url()))
      .toContain('https://www.googletagmanager.com/gtag/js?id=G-E2ETEST000');
    await expect.poll(() => traffic.posthog.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => localStorage.getItem('jl-cookies'))).toBe('all');
    expect(posthogPayloads(traffic.posthog)).not.toContain('$cookieless_mode');
  });
});

test.describe('consent: revisiting the choice', () => {
  test('"Cookie settings" reopens the banner, and withdrawing clears Google cookies', async ({
    page,
    context,
  }) => {
    const traffic = watchTraffic(page);
    await gotoLocale(page, 'en');
    await (await bannerShown(page)).getByRole('button', { name: 'Accept' }).click();
    await expect.poll(() => traffic.google.length).toBeGreaterThan(0);

    // The stubbed gtag.js writes nothing, so plant what the real one would leave behind.
    await context.addCookies([{ name: '_ga', value: 'GA1.1.1', url: SITE }]);
    await expect.poll(() => traffic.posthog.length).toBeGreaterThan(0);
    const before = await analyticsStorage(page);
    expect(before).toContain('_ga');
    expect(before.some((key) => key.startsWith('ph_'))).toBe(true);

    const settings = page.getByRole('button', { name: 'Cookie settings' });
    await settings.click();
    const banner = page.getByRole('region', { name: 'Cookie consent' });
    await expect(banner).toBeVisible();
    await expect(banner).toBeFocused();

    await banner.getByRole('button', { name: 'Only essential' }).click();
    await expect(banner).toBeHidden();
    await expect(settings).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('jl-cookies'))).toBe('essential');
    // Only PostHog's own record of the opt-out may remain: no Google cookie, no ph_* identifier
    // or session key, in localStorage, sessionStorage or cookies.
    const optOutFlag = ['__ph_opt_in_out_phc_e2e_test_key'];
    await expect.poll(() => analyticsStorage(page)).toEqual(optOutFlag);

    // The next page view is counted cookielessly, and the reload brings nothing back.
    const sent = traffic.posthog.length;
    await page.reload();
    await expect
      .poll(() => posthogPayloads(traffic.posthog.slice(sent)))
      .toContain('$cookieless_mode');
    expect(await analyticsStorage(page)).toEqual(optOutFlag);
  });

  test('can switch back to "Accept" without a reload', async ({ page }) => {
    const traffic = watchTraffic(page);
    await gotoLocale(page, 'en');
    await (await bannerShown(page)).getByRole('button', { name: 'Only essential' }).click();
    await expect.poll(() => traffic.posthog.length).toBeGreaterThan(0);
    expect(traffic.google).toEqual([]);

    await page.getByRole('button', { name: 'Cookie settings' }).click();
    await page
      .getByRole('region', { name: 'Cookie consent' })
      .getByRole('button', { name: 'Accept' })
      .click();

    await expect.poll(() => traffic.google.length).toBeGreaterThan(0);
  });

  test('an unrecognised stored value is treated as no choice', async ({ page }) => {
    const traffic = watchTraffic(page);
    await page.addInitScript(() => {
      localStorage.setItem('jl-cookies', 'maybe');
    });
    await gotoLocale(page, 'en');
    await bannerShown(page);
    await settleAnalyticsStartup(page);
    expect(traffic.google).toEqual([]);
    expect(traffic.posthog).toEqual([]);
  });
});
