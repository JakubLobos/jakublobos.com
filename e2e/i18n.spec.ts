import { expect, gotoLocale, test, type Locale } from './fixtures.ts';
import { SITE } from './ports.ts';

const LOCALES: readonly Locale[] = ['en', 'pl'];

test.describe('@i18n head metadata', () => {
  test.use({ locale: 'en-US' });

  for (const locale of LOCALES) {
    test(`${locale}: lang, title, hreflang and OG image are set`, async ({ page }) => {
      await gotoLocale(page, locale);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page).toHaveTitle(/\S/);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        `${SITE}/og/og-animation-v2.gif`,
      );
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
        'href',
        `${SITE}/`,
      );
      await expect(page.locator('link[rel="alternate"][hreflang="pl"]')).toHaveAttribute(
        'href',
        `${SITE}/pl`,
      );
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
        'href',
        `${SITE}/`,
      );
    });
  }

  test('the two locales have different titles', async ({ page }) => {
    await gotoLocale(page, 'en');
    const english = await page.title();
    await gotoLocale(page, 'pl');
    expect(await page.title()).not.toBe(english);
  });
});

test.describe('@i18n Polish 404', () => {
  // Browsers log the 404 status of the document itself as a console error.
  test.use({ ignoredConsoleErrors: [/status of 404/] });

  test('/pl/missing shows the Polish 404', async ({ page }) => {
    const response = await page.goto('/pl/missing');
    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });
});

test.describe('@i18n switcher', () => {
  test.use({ locale: 'pl-PL' });

  test('a Polish browser lands on /pl; choosing EN sticks on reload of /', async ({
    page,
    browserName,
    isMobile,
  }) => {
    test.skip(isMobile, 'the header switcher is replaced by the menu dialog on narrow screens');
    test.skip(browserName === 'webkit', 'WebKit refuses Secure cookies on http://localhost');
    await page.goto('/');
    await expect(page).toHaveURL('/pl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');

    await page.locator('header').getByRole('link', { name: /EN/ }).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
