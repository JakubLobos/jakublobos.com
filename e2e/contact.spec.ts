import type { Page } from '@playwright/test';
import {
  expect,
  expectNoA11yViolations,
  fulfillJson,
  gotoLocale,
  sendsForReal,
  test,
} from './fixtures.ts';
import { API, SITE } from './ports.ts';

// The typing-field mirror animates glyphs, which makes contrast sampling flaky.
test.use({ reducedMotion: 'reduce' });

const CONTACT = `${API}/api/contact`;
const PHONE = `${API}/api/contact/phone`;

async function fillForm(page: Page, message: string): Promise<void> {
  await page.getByLabel('YOUR NAME').fill('Jane Doe');
  await page.getByLabel('EMAIL', { exact: true }).fill('jane@company.com');
  await page.getByLabel('MESSAGE', { exact: true }).fill(message);
}

// The API's global cap is 20 messages/hour, so only one project sends real ones; the others get
// the same status codes stubbed and still exercise every state of the form.
test.describe('@contact form', () => {
  // The stubbed 503 of the mailer-failure journey is logged by the browser as a failed load.
  test.use({ ignoredConsoleErrors: [/Failed to load resource|status of 503/i] });

  test.beforeEach(async ({ page }) => {
    await gotoLocale(page, 'en');
    await page.locator('#contact').scrollIntoViewIfNeeded();
  });

  test('sends a message and offers to send another', async ({ page }, testInfo) => {
    if (!sendsForReal(testInfo.project.name)) {
      await page.route(CONTACT, (route) => fulfillJson(route, 200, { data: { status: 'sent' } }));
    }
    await fillForm(page, 'I would love to talk about a project.');
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

  test('an empty submit shows three errors and focuses Name', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST') posts.push(request.url());
    });
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByLabel('YOUR NAME')).toBeFocused();
    await expect(page.locator('#contact-name-error')).toHaveText('Please tell me your name.');
    await expect(page.locator('#contact-email-error')).toHaveText('I need your email to reply.');
    await expect(page.locator('#contact-message-error')).toHaveText(
      'A few more words, please (min. 10 characters).',
    );
    expect(posts).toEqual([]);
    await expectNoA11yViolations(page, { include: '#contact' });
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

  test('a mailer failure shows the error status and keeps the fields', async ({
    page,
  }, testInfo) => {
    if (!sendsForReal(testInfo.project.name)) {
      await page.route(CONTACT, (route) =>
        fulfillJson(route, 503, { error: { code: 'UNAVAILABLE', message: 'mail down' } }),
      );
    }
    // The console mailer reports a provider outage for any text containing "[fail]".
    const message = 'Please call me back about the project [fail]';
    await fillForm(page, message);
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.locator('[data-status]')).toHaveText(
      'Couldn’t send your message right now. Please try again, or email me directly.',
    );
    await expect(page.getByLabel('YOUR NAME')).toHaveValue('Jane Doe');
    await expect(page.getByLabel('EMAIL', { exact: true })).toHaveValue('jane@company.com');
    await expect(page.getByLabel('MESSAGE', { exact: true })).toHaveValue(message);
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });
});

test.describe('@contact phone reveal', () => {
  // The failing request is logged by the browser as a failed resource load.
  test.use({ ignoredConsoleErrors: [/Failed to load resource|status of 4\d\d/i] });

  test('the number is absent from every page’s HTML until the check passes', async ({
    request,
  }) => {
    for (const path of ['/', '/pl']) {
      const html = await (await request.get(`${SITE}${path}`)).text();
      expect(html, path).not.toMatch(/\+\s?48|tel:/);
    }
  });

  test('reveals the phone number as a tel link only after the check', async ({ page }) => {
    await gotoLocale(page, 'en');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(page.locator('#contact')).not.toContainText('+48');
    await expect(page.locator('#contact a[href^="tel:"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Show number' }).click();

    const link = page.locator('#contact a[href^="tel:"]');
    await expect(link).toHaveAttribute('href', 'tel:+48000000000');
    await expect(link).toHaveText('+48 000 000 000');
    await expect(link).toBeFocused();
    await expect(page.locator('phone-reveal [data-announce]')).toHaveText('Phone number shown.');
    await expectNoA11yViolations(page, { include: '#contact' });
  });

  // The built site runs with an empty Turnstile sitekey, so the widget (and its always-fail test
  // key) is not in play; a rejected verification at the API is the same path for the visitor.
  test('a failed verification shows an error line and the retry succeeds', async ({ page }) => {
    await gotoLocale(page, 'en');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.route(
      PHONE,
      (route) => fulfillJson(route, 403, { error: { code: 'FORBIDDEN', message: 'no' } }),
      { times: 1 },
    );
    const show = page.getByRole('button', { name: 'Show number' });
    await show.click();

    await expect(page.getByText('Couldn’t verify. Try again.')).toBeVisible();
    await expect(page.locator('#contact a[href^="tel:"]')).toHaveCount(0);
    await expect(show).toBeEnabled();

    await show.click();
    await expect(page.locator('#contact a[href^="tel:"]')).toHaveAttribute(
      'href',
      'tel:+48000000000',
    );
    await expect(page.getByText('Couldn’t verify. Try again.')).toBeHidden();
  });
});
