import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures.ts';

test.use({ reducedMotion: 'reduce', locale: 'en-US' });

const SECTIONS = [
  { id: 'experience', name: 'Experience' },
  { id: 'projects', name: 'Projects' },
  { id: 'skills', name: 'Skills' },
  { id: 'guestbook', name: 'Guestbook' },
  { id: 'contact', name: 'Contact' },
] as const;

test.describe('@nav desktop', () => {
  test('anchors scroll to their section and mark it with aria-current', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the desktop nav is replaced by the menu on narrow screens');
    await page.goto('/');
    const nav = page.locator('scroll-spy');

    for (const { id, name } of SECTIONS) {
      const link = nav.getByRole('link', { name, exact: true });
      await link.click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(link).toHaveAttribute('aria-current', 'location');
      await expect(nav.locator('[aria-current="location"]')).toHaveCount(1);
      const top = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
      expect(top, `#${id} is scrolled near the top`).toBeLessThan(300);
    }
  });
});

test.describe('@nav mobile menu', () => {
  const dialog = (page: Page) => page.locator('#mobile-menu');
  const trigger = (page: Page) => page.getByRole('button', { name: 'Open menu' });

  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the menu only exists on narrow screens');
    await page.goto('/');
  });

  test('opens, traps focus, locks scroll, and closes on Escape with focus restored', async ({
    page,
  }) => {
    await trigger(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-menu-open', '');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();
    expect(await page.locator('html').evaluate((el) => getComputedStyle(el).overflow)).toBe(
      'hidden',
    );
    await expectNoA11yViolations(page, { include: '#mobile-menu' });

    // Tabbing forwards and backwards past either end never leaves the dialog.
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 14; i += 1) {
        await page.keyboard.press(key);
        expect(await page.evaluate(() => document.activeElement?.closest('dialog')?.id)).toBe(
          'mobile-menu',
        );
      }
    }

    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-menu-open', '');
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('a link click closes the menu and goes to the section', async ({ page }) => {
    await trigger(page).click();
    await dialog(page)
      .getByRole('link', { name: /Projects/ })
      .click();
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(/#projects$/);
    await expect(page.locator('html')).not.toHaveAttribute('data-menu-open', '');
  });
});
