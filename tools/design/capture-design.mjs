// Renders docs/design/design.html (the Claude Design bundle) and captures the reference
// screenshots in docs/design/screenshots/. Used during planning; T-042 extends it into a
// design-vs-implementation comparison tool.
//
// Usage (after T-040 installs @playwright/test and its browsers):
//   node tools/design/capture-design.mjs [--design docs/design/design.html] [--out docs/design/screenshots]
// Callbacks passed to page.evaluate() run in the browser, hence the browser globals.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    design: { type: 'string', default: 'docs/design/design.html' },
    out: { type: 'string', default: 'docs/design/screenshots' },
  },
});

const designUrl = pathToFileURL(resolve(values.design)).href;
const outDir = resolve(values.out);
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  { width: 1440, height: 900, tag: 'desktop-1440' },
  { width: 1024, height: 768, tag: 'tablet-1024' },
  { width: 768, height: 1024, tag: 'tablet-768' },
  { width: 390, height: 844, tag: 'mobile-390' },
];

const browser = await chromium.launch();
const errors = [];

async function open({ width, height }, { reducedMotion = false, consentStored = true } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  if (consentStored) {
    await context.addInitScript(() => localStorage.setItem('jl-cookies', 'essential'));
  }
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${width}x${height}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${width}x${height} console: ${message.text()}`);
  });
  await page.goto(designUrl);
  await page.waitForSelector('#top', { timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  // The bundle unpacks assets and the cookie banner appears after 900 ms.
  await page.waitForTimeout(1500);
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });
const scrollToSection = (page, id) =>
  page.evaluate((sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'instant' });
  }, id);

{
  const { context, page } = await open(VIEWPORTS[0], { consentStored: false });
  await shot(page, 'desktop-1440-hero-with-cookie-banner');
  await context.close();
}

for (const viewport of VIEWPORTS) {
  const { context, page } = await open(viewport);
  await shot(page, `${viewport.tag}-hero`);

  const { top, height } = await page.evaluate(() => {
    const section = document.getElementById('experience');
    return {
      top: section.getBoundingClientRect().top + window.scrollY,
      height: section.offsetHeight,
    };
  });
  if (height > viewport.height * 1.5) {
    for (const [step, fraction] of [
      [1, 0.15],
      [2, 0.5],
      [3, 0.85],
    ]) {
      await page.evaluate(
        (y) => window.scrollTo(0, y),
        top + (height - viewport.height) * fraction,
      );
      await page.waitForTimeout(600);
      await shot(page, `${viewport.tag}-experience-step${step}`);
    }
  } else {
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(400);
    await shot(page, `${viewport.tag}-experience-compact`);
  }

  for (const id of ['projects', 'skills', 'guestbook', 'contact']) {
    await scrollToSection(page, id);
    await page.waitForTimeout(400);
    await shot(page, `${viewport.tag}-${id}`);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  await shot(page, `${viewport.tag}-footer`);
  await context.close();
}

{
  const { context, page } = await open(VIEWPORTS[0]);
  await scrollToSection(page, 'guestbook');
  await page.fill('input[aria-label="Your message"]', 'Hello from the planning agent');
  await page.waitForTimeout(500);
  await shot(page, 'desktop-1440-guestbook-typing');
  await page.click('button:has-text("Leave a mark")');
  await page.waitForTimeout(500);
  await shot(page, 'desktop-1440-guestbook-modal');
  await page.keyboard.press('Escape');

  await scrollToSection(page, 'contact');
  await page.click('button:has-text("Send message")');
  await page.waitForTimeout(400);
  await shot(page, 'desktop-1440-contact-errors');
  await page.fill('input[name=name]', 'Jane Doe');
  await page.fill('input[name=email]', 'jane@company.com');
  await page.fill('textarea[name=message]', 'I would love to talk about a project.');
  await page.click('button:has-text("Send message")');
  await page.waitForTimeout(300);
  await shot(page, 'desktop-1440-contact-loading');
  await page.waitForTimeout(1800);
  await shot(page, 'desktop-1440-contact-success');
  await context.close();
}

{
  const { context, page } = await open(VIEWPORTS[3]);
  await page.click('button[aria-label="Open menu"]');
  await page.waitForTimeout(400);
  await shot(page, 'mobile-390-menu-open');
  await context.close();
}

{
  const { context, page } = await open(VIEWPORTS[0], { reducedMotion: true });
  await page.evaluate(() =>
    document
      .querySelector('section[aria-label="Skills and about me"]')
      ?.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  await page.waitForTimeout(300);
  await shot(page, 'desktop-1440-marquee-reduced-motion');
  await context.close();
}

await browser.close();
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Screenshots written to ${outDir}`);
}
