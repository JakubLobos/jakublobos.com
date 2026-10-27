import type { Page } from '@playwright/test';
import { expect, expectNoA11yViolations, test } from './fixtures.ts';

// The type-in mirror animates per character; the visible control text is what we assert on.
test.use({ reducedMotion: 'reduce', locale: 'en-US' });

async function openGuestbook(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('#guestbook').scrollIntoViewIfNeeded();
  // The controls ship disabled and the script enables them.
  await expect(page.getByRole('button', { name: 'Leave a mark' })).toBeEnabled();
}

test.describe('@smoke guestbook', () => {
  test('loads the last-visitor block and is accessible', async ({ page }) => {
    await openGuestbook(page);
    // The database is shared between projects, so the state depends on test order; both are valid.
    await expect(page.locator('last-visitor')).toHaveAttribute('data-state', /^(empty|message)$/);
    await expectNoA11yViolations(page, { include: '#guestbook' });
  });

  test('shows a localized field error without sending anything', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST') posts.push(request.url());
    });
    await openGuestbook(page);

    const field = page.locator('#guestbook-body');
    await field.fill('visit example.com now');
    await page.getByRole('button', { name: 'Leave a mark' }).click();

    await expect(page.locator('#guestbook-error')).toHaveText(/Links aren’t allowed/);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveValue('visit example.com now');
    expect(posts).toEqual([]);

    await field.fill('a plain message');
    await expect(page.locator('#guestbook-error')).toBeEmpty();
    await expectNoA11yViolations(page, { include: '#guestbook' });
  });

  test('a submitted mark opens the review modal and, once approved, becomes the latest', async ({
    page,
  }, testInfo) => {
    // The API allows 3 submissions per client per 10 minutes and every project shares one server.
    test.skip(testInfo.project.name !== 'chromium-desktop', 'one real submission per run');
    await openGuestbook(page);

    // Letters only: a long digit run would (rightly) be rejected as contact info.
    const unique = Array.from(String(Date.now()), (digit) => 'abcdefghij'[Number(digit)]).join('');
    const text = `Hello from the e2e suite ${unique}`;
    await page.locator('#guestbook-body').fill(text);
    await page.getByRole('radio', { name: 'Violet' }).check({ force: true });
    await page.getByRole('button', { name: 'Leave a mark' }).click();

    const modal = page.getByRole('dialog', { name: 'Thanks for your mark!' });
    await expect(modal).toBeVisible();
    await expect(modal.locator('[data-echo-text]')).toHaveText(text);
    await expect(page.getByRole('button', { name: 'Got it' })).toBeFocused();
    await expect(page.locator('#guestbook-body')).toHaveValue('');
    await expectNoA11yViolations(page, { include: '#guestbook-modal' });

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page.locator('#guestbook-body')).toBeFocused();

    // The fake reviewer approves in the background; reload until the new quote shows.
    const quote = page.locator('[data-quote-text]');
    await expect(async () => {
      await page.reload();
      await page.locator('#guestbook').scrollIntoViewIfNeeded();
      await expect(quote).toHaveText(text, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await expect(quote.locator('xpath=..')).toHaveAttribute('style', /--paint-violet-tint/);
    await expectNoA11yViolations(page, { include: '#guestbook' });
  });
});
