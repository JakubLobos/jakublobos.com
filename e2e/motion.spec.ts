import type { Browser } from '@playwright/test';
import { expect, gotoLocale, test } from './fixtures.ts';

const probe = () => {
  const track = document.querySelector('.track');
  const mirror = document.querySelector('typing-field .mirror');
  return {
    marquee: track ? getComputedStyle(track).animationName : 'missing',
    mirror: mirror ? getComputedStyle(mirror).display : 'missing',
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
  };
};

async function sample(browser: Browser, baseURL: string | undefined, reduced: boolean) {
  const context = await browser.newContext({
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    ...(baseURL === undefined ? {} : { baseURL }),
  });
  try {
    const page = await context.newPage();
    await gotoLocale(page, 'en');
    // The mirror is gated on the custom element being defined; wait for the script first.
    await page.waitForFunction(() => customElements.get('typing-field') !== undefined);
    return await page.evaluate(probe);
  } finally {
    await context.close();
  }
}

test.describe('@motion', () => {
  test('reduced motion: static marquee, no type-in mirror, instant scrolling', async ({
    browser,
    baseURL,
  }) => {
    expect(await sample(browser, baseURL, true)).toEqual({
      marquee: 'none',
      mirror: 'none',
      scroll: 'auto',
    });
  });

  test('no preference: the same probes report motion (guards the test above)', async ({
    browser,
    baseURL,
  }) => {
    const result = await sample(browser, baseURL, false);
    expect(result.marquee).toMatch(/^marquee-/);
    expect(result.mirror).toBe('block');
    expect(result.scroll).toBe('smooth');
  });
});
