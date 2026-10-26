import { expect, expectNoA11yViolations, gotoLocale, test, type Locale } from './fixtures.ts';
import { API } from './ports.ts';

// Animations (marquee, type-in) make contrast sampling flaky; motion has its own specs.
test.use({ reducedMotion: 'reduce' });

const PAGES: readonly { path: string; locale: Locale; status: number }[] = [
  { path: '/', locale: 'en', status: 200 },
  { path: '/', locale: 'pl', status: 200 },
  { path: '/privacy', locale: 'en', status: 200 },
  { path: '/privacy', locale: 'pl', status: 200 },
  { path: '/nope', locale: 'en', status: 404 },
  { path: '/nope', locale: 'pl', status: 404 },
];

test.describe('@smoke pages', () => {
  // The root path negotiates the language from Accept-Language.
  test.use({ locale: 'en-US' });
  // Browsers log the 404 status of the document itself as a console error.
  test.use({ ignoredConsoleErrors: [/status of 404/] });

  for (const { path, locale, status } of PAGES) {
    test(`${locale} ${path} loads cleanly and is accessible`, async ({ page }) => {
      const response = await gotoLocale(page, locale, path);
      expect(response.status()).toBe(status);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await page.waitForLoadState('load');
      await expectNoA11yViolations(page);
    });
  }
});

test.describe('@smoke language negotiation', () => {
  // Playwright derives the Accept-Language header from the locale option.
  test.use({ locale: 'pl' });

  test('/ redirects a Polish browser to /pl', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/pl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });

  test('/set-language stores the choice and / stays English', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit refuses Secure cookies on http://localhost; Chromium covers it',
    );
    await page.goto('/set-language?lang=en&to=/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === 'lang')?.value).toBe('en');

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('@smoke the site origin is allowed to call the API (CORS)', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async (api) => {
    try {
      const response = await fetch(`${api}/api/health`);
      return `HTTP ${String(response.status)}`;
    } catch (error) {
      return `blocked: ${String(error)} (is the site origin in CORS_ALLOWED_ORIGINS?)`;
    }
  }, API);
  expect(result).toBe('HTTP 200');
});
