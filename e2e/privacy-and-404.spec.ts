import { expect, expectNoA11yViolations, gotoLocale, test, type Locale } from './fixtures.ts';

const LOCALES: readonly Locale[] = ['en', 'pl'];

// Animations make axe's contrast sampling flaky; motion has its own specs.
test.use({ reducedMotion: 'reduce' });

test.describe('privacy policy', () => {
  for (const locale of LOCALES) {
    test(`${locale}: one h1, headings in order, readable measure, no overflow`, async ({
      page,
    }) => {
      await gotoLocale(page, locale, '/privacy');

      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      const levels = await page
        .locator('main :is(h1, h2, h3)')
        .evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
      expect(levels[0]).toBe(1);
      levels.forEach((level, index) => {
        // A heading may go at most one level deeper than the one before it.
        if (index > 0) expect(level - (levels[index - 1] ?? 0)).toBeLessThanOrEqual(1);
      });
      expect(levels).toContain(3);

      // 70ch of body text is about 560 px; the cap allows for font fallbacks.
      const widest = await page
        .locator('main section > p')
        .evaluateAll((paragraphs) => Math.max(...paragraphs.map((p) => p.clientWidth)));
      expect(widest).toBeLessThanOrEqual(680);

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        'the page must not scroll sideways',
      ).toBe(true);
      await expectNoA11yViolations(page);
    });
  }

  // Same shape in both languages: a guard against EN and PL drifting apart.
  const DATA_TABLE: Record<Locale, { name: string; ga4: string; posthog: string }> = {
    en: {
      name: 'Personal data processed on this site',
      ga4: 'Google Analytics 4 cookies and identifiers',
      posthog: 'PostHog cookieless counting',
    },
    pl: {
      name: 'Dane osobowe przetwarzane na tej stronie',
      ga4: 'Cookies i identyfikatory Google Analytics 4',
      posthog: 'Bezcookiesowe zliczanie PostHog',
    },
  };

  for (const locale of LOCALES) {
    test(`${locale}: the data table lists every data category and its columns`, async ({
      page,
    }) => {
      await gotoLocale(page, locale, '/privacy');
      const expected = DATA_TABLE[locale];
      const table = page.getByRole('region', { name: expected.name });
      await expect(table.getByRole('columnheader')).toHaveCount(5);
      // Header row + 12 data categories (security.md §8 plus the approved hosting row).
      await expect(table.getByRole('row')).toHaveCount(13);
      await expect(table.getByText(expected.ga4)).toBeVisible();
      await expect(table.getByText(expected.posthog)).toBeVisible();
    });
  }

  test('the language switcher swaps between /privacy and /pl/privacy', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the header switcher is replaced by the menu dialog on narrow screens');
    await gotoLocale(page, 'en', '/privacy');
    await expect(page).toHaveTitle('Privacy policy — Jakub Łobos');
    await page.locator('header').getByRole('link', { name: /PL/ }).click();
    await expect(page).toHaveURL('/pl/privacy');
    await expect(page).toHaveTitle('Polityka prywatności — Jakub Łobos');

    await page.locator('header').getByRole('link', { name: /EN/ }).click();
    await expect(page).toHaveURL('/privacy');
  });
});

test.describe('404 page', () => {
  test.use({ ignoredConsoleErrors: [/status of 404/] });

  const HOME: Record<Locale, string> = { en: '/', pl: '/pl' };

  for (const locale of LOCALES) {
    test(`${locale}: is noindex, accessible, and links home`, async ({ page }) => {
      // A nested path proves the page needs no relative URLs to render.
      const response = await gotoLocale(page, locale, '/no/such/page');
      expect(response.status()).toBe(404);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expectNoA11yViolations(page);

      await page.locator('main').getByRole('link').first().click();
      await expect(page).toHaveURL(HOME[locale]);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
    });
  }

  test('the switcher on a 404 leads to the other language’s home page', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the header switcher is replaced by the menu dialog on narrow screens');
    await gotoLocale(page, 'en', '/nope');
    await page.locator('header').getByRole('link', { name: /PL/ }).click();
    await expect(page).toHaveURL('/pl');

    await gotoLocale(page, 'pl', '/nope');
    await page.locator('header').getByRole('link', { name: /EN/ }).click();
    await expect(page).toHaveURL('/');
  });
});
