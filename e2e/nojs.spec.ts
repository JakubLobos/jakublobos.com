import { expect, test } from '@playwright/test';

// Without JavaScript the page guards in fixtures.ts (exposed bindings) cannot run, so this spec
// uses the plain test. The static HTML must stand on its own.
test.use({ javaScriptEnabled: false, locale: 'en-US' });

test.describe('@nojs', () => {
  test.beforeEach((_fixtures, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'static HTML: one engine is enough');
  });

  test('all sections are visible and the dead controls say what to do instead', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const id of ['experience', 'projects', 'skills', 'guestbook', 'contact']) {
      await expect(page.locator(`#${id}`), id).toBeVisible();
    }
    await expect(
      page.locator('p, span', { hasText: 'Leaving a mark needs JavaScript.' }).first(),
    ).toBeVisible();
    await expect(
      page.locator('.panel-static p', { hasText: 'No marks yet. Be the first to leave one!' }),
    ).toBeVisible();
    await expect(
      page
        .locator('p, span', { hasText: 'This form needs JavaScript. Please email me instead.' })
        .first(),
    ).toBeVisible();
    await expect(
      page.locator('p, span', { hasText: 'Use the contact form or email.' }).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show number' })).toBeHidden();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByRole('link', { name: 'Projects', exact: true }).click();
    await expect(page).toHaveURL(/#projects$/);

    await page
      .locator('footer')
      .getByRole('link', { name: /privacy/i })
      .first()
      .click();
    await expect(page).toHaveURL('/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('the language switcher is a plain link', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').getByRole('link', { name: /PL/ }).click();
    await expect(page).toHaveURL('/pl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });
});
