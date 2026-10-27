import type { Page } from '@playwright/test';
import {
  expect,
  expectNoA11yViolations,
  fulfillJson,
  latestGuestbookBody,
  sendsForReal,
  test,
  uniqueWord,
} from './fixtures.ts';
import { API } from './ports.ts';

// The type-in mirror animates per character; the visible control text is what we assert on.
test.use({ reducedMotion: 'reduce', locale: 'en-US' });

const LATEST = `${API}/api/guestbook/latest`;
const SUBMIT = `${API}/api/guestbook`;
const RELEASED = { data: { message: null } };

async function openGuestbook(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('#guestbook').scrollIntoViewIfNeeded();
  // The controls ship disabled and the script enables them.
  await expect(page.getByRole('button', { name: 'Leave a mark' })).toBeEnabled();
}

async function leaveMark(page: Page, text: string, paint?: string): Promise<void> {
  await page.locator('#guestbook-body').fill(text);
  if (paint !== undefined) await page.getByRole('radio', { name: paint }).check({ force: true });
  await page.getByRole('button', { name: 'Leave a mark' }).click();
}

test.describe('@guestbook display states', () => {
  // Mocked 500s and aborts are logged by the browser as failed resource loads.
  test.use({ ignoredConsoleErrors: [/Failed to load resource|net::ERR|status of 500/i] });

  const visitor = (page: Page) => page.locator('last-visitor');

  test('loading is visible before the fetch resolves, then the message replaces it', async ({
    page,
  }) => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(LATEST, async (route) => {
      await gate;
      await fulfillJson(route, 200, {
        data: {
          message: {
            id: 'e2e',
            body: 'Delayed hello',
            paint: 'coral',
            publishedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      });
    });
    await page.goto('/');
    await page.locator('#guestbook').scrollIntoViewIfNeeded();

    await expect(visitor(page)).toHaveAttribute('data-state', 'loading');
    await expect(page.locator('[data-stage]')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByText('Loading the latest mark…')).toBeAttached();

    release();
    await expect(visitor(page)).toHaveAttribute('data-state', 'message');
    await expect(page.locator('[data-quote-text]')).toHaveText('Delayed hello');
    await expect(page.locator('[data-quote-text]').locator('xpath=..')).toHaveAttribute(
      'style',
      /--tint: var\(--paint-coral-tint\)/,
    );
  });

  test('a null message shows the empty state', async ({ page }) => {
    await page.route(LATEST, (route) => fulfillJson(route, 200, RELEASED));
    await page.goto('/');
    await page.locator('#guestbook').scrollIntoViewIfNeeded();
    await expect(visitor(page)).toHaveAttribute('data-state', 'empty');
    await expect(page.getByText('No marks yet. Be the first to leave one!')).toBeVisible();
  });

  for (const failure of ['500', 'abort'] as const) {
    test(`an API ${failure} shows the error line and "Try again" recovers`, async ({ page }) => {
      let calls = 0;
      await page.route(LATEST, async (route) => {
        calls += 1;
        if (calls > 1) {
          await fulfillJson(route, 200, RELEASED);
        } else if (failure === '500') {
          await fulfillJson(route, 500, { error: { code: 'INTERNAL', message: 'boom' } });
        } else {
          await route.abort('failed');
        }
      });
      await page.goto('/');
      await page.locator('#guestbook').scrollIntoViewIfNeeded();

      await expect(visitor(page)).toHaveAttribute('data-state', 'error');
      await expect(page.getByText('Couldn’t load the latest mark right now.')).toBeVisible();

      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(visitor(page)).toHaveAttribute('data-state', 'empty');
      await expect(page.locator('[data-stage]')).toBeFocused();
    });
  }

  test('the block keeps its height across all four states', async ({ page }) => {
    const heights = new Map<string, number>();
    const bodies: Record<string, { status: number; json: unknown }> = {
      message: {
        status: 200,
        json: {
          data: {
            message: {
              id: 'e2e',
              body: 'A short mark',
              paint: 'blue',
              publishedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        },
      },
      empty: { status: 200, json: RELEASED },
      error: { status: 500, json: { error: { code: 'INTERNAL', message: 'boom' } } },
    };
    for (const [state, { status, json }] of Object.entries(bodies)) {
      await page.unroute(LATEST);
      await page.route(LATEST, (route) => fulfillJson(route, status, json));
      await page.goto('/');
      await page.locator('#guestbook').scrollIntoViewIfNeeded();
      await expect(visitor(page)).toHaveAttribute('data-state', state);
      heights.set(state, (await visitor(page).boundingBox())?.height ?? -1);
    }
    expect(heights.get('message')).toBeGreaterThan(0);
    expect(heights.get('empty')).toBe(heights.get('message'));
    expect(heights.get('error')).toBe(heights.get('message'));
  });
});

test.describe('@guestbook form', () => {
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

  test('submitting echoes the text with its tint in the review modal, then resets', async ({
    page,
  }) => {
    // Real sends are covered by the moderation journey below; here the answer is stubbed so every
    // project can exercise the modal without spending the server's global cap.
    await page.route(SUBMIT, (route) => fulfillJson(route, 202, { data: { status: 'received' } }));
    await openGuestbook(page);

    await leaveMark(page, 'Hello from the modal check', 'Violet');

    const modal = page.getByRole('dialog', { name: 'Thanks for your mark!' });
    await expect(modal).toBeVisible();
    await expect(modal.locator('[data-echo-text]')).toHaveText('Hello from the modal check');
    await expect(modal.locator('[data-echo-text]').locator('xpath=..')).toHaveAttribute(
      'style',
      /--paint-violet-tint/,
    );
    await expect(page.getByRole('button', { name: 'Got it' })).toBeFocused();
    await expect(page.locator('#guestbook-body')).toHaveValue('');
    await expectNoA11yViolations(page, { include: '#guestbook-modal' });

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page.locator('#guestbook-body')).toBeFocused();
  });
});

test.describe('@guestbook moderation outcomes (real server)', () => {
  test('rejected and failed reviews never publish; the newest message wins; XSS stays text', async ({
    page,
    request,
  }, testInfo) => {
    test.skip(!sendsForReal(testInfo.project.name), 'one real run: the global caps are shared');
    test.setTimeout(60_000);
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    await openGuestbook(page);

    const word = uniqueWord();
    const modal = page.getByRole('dialog', { name: 'Thanks for your mark!' });
    const hello = `Hello from the e2e suite ${word}`;
    const earlier = [`[flag] ${hello}`, `[unsuitable] ${hello}`, `[fail] ${hello}`];
    // Every outcome looks the same to the visitor: the uniform "in review" modal.
    for (const text of earlier) {
      await leaveMark(page, text);
      await expect(modal).toBeVisible();
      await expect(modal.locator('[data-echo-text]')).toHaveText(text);
      await page.getByRole('button', { name: 'Got it' }).click();
      await expect(modal).toBeHidden();
      await expect(page.locator('#guestbook-body')).toHaveValue('');
    }

    const payload = `<img src=x onerror=window.__xss=1> ${hello}`;
    await leaveMark(page, payload, 'Violet');
    await expect(modal.locator('[data-echo-text]')).toHaveText(payload);
    await page.getByRole('button', { name: 'Got it' }).click();

    const seen = new Set<string>();
    await expect
      .poll(
        async () => {
          const body = await latestGuestbookBody(request);
          if (body !== null) seen.add(body);
          return body;
        },
        { timeout: 5_000, intervals: [250] },
      )
      .toBe(payload);
    for (const text of earlier) expect(seen).not.toContain(text);

    await page.reload();
    await page.locator('#guestbook').scrollIntoViewIfNeeded();
    const quote = page.locator('[data-quote-text]');
    await expect(quote).toHaveText(payload);
    await expect(quote.locator('img')).toHaveCount(0);
    await expect(quote.locator('xpath=..')).toHaveAttribute('style', /--paint-violet-tint/);
    expect(await page.evaluate(() => '__xss' in window)).toBe(false);
    expect(dialogs).toEqual([]);
    await expectNoA11yViolations(page, { include: '#guestbook' });
  });
});
