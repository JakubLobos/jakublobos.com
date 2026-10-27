import { expect, expectNoA11yViolations, gotoLocale, test } from './fixtures.ts';

// The typing-field mirror animates glyphs, which makes contrast sampling flaky.
test.use({ reducedMotion: 'reduce' });

// The API allows 3 contact messages per client per 10 minutes and every project shares one
// server, so only the happy path sends a real message.
test.describe('@smoke contact', () => {
  test.beforeEach(async ({ page }) => {
    await gotoLocale(page, 'en');
    await page.locator('#contact').scrollIntoViewIfNeeded();
  });

  test('sends a message and offers to send another', async ({ page }) => {
    await page.getByLabel('YOUR NAME').fill('Jane Doe');
    await page.getByLabel('EMAIL', { exact: true }).fill('jane@company.com');
    await page.getByLabel('MESSAGE', { exact: true }).fill('I would love to talk about a project.');
    await page.getByRole('button', { name: 'Send message' }).click();

    const sent = page.getByRole('button', { name: 'Message sent' });
    await expect(sent).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('[data-status]')).toHaveText(
      'Thanks! I’ll get back to you at jane@company.com.',
    );
    await expectNoA11yViolations(page, { include: '#contact' });

    await page.getByRole('button', { name: 'Send another' }).click();
    await expect(page.getByLabel('YOUR NAME')).toBeFocused();
    await expect(page.getByLabel('YOUR NAME')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });

  test('shows field errors and focuses the first invalid field', async ({ page }) => {
    await page.getByLabel('YOUR NAME').fill('Jane Doe');
    await page.getByLabel('EMAIL', { exact: true }).fill('jane@company');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByLabel('EMAIL', { exact: true })).toBeFocused();
    await expect(page.getByLabel('EMAIL', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#contact-email-error')).toHaveText(
      'That email doesn’t look quite right.',
    );
    await expect(page.locator('#contact-message-error')).toHaveText(
      'A few more words, please (min. 10 characters).',
    );
    await expectNoA11yViolations(page, { include: '#contact' });
  });

  test('reveals the phone number as a tel link only after the check', async ({ page }) => {
    await expect(page.locator('#contact')).not.toContainText('+48');

    await page.getByRole('button', { name: 'Show number' }).click();

    const link = page.locator('#contact a[href^="tel:"]');
    await expect(link).toHaveAttribute('href', 'tel:+48000000000');
    await expect(link).toHaveText('+48 000 000 000');
    await expect(link).toBeFocused();
    await expectNoA11yViolations(page, { include: '#contact' });
  });
});
