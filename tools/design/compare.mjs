// Comparison mode of capture-design.mjs (T-042): drives the design prototype and the built site
// through the same states and writes design|implementation side-by-side PNGs.
// Callbacks passed to page.evaluate() run in the browser, hence the browser globals.
import { readdirSync, rmSync } from 'node:fs';

// Dynamic regions are painted over in both images so they never count as a deviation.
const MASK = {
  design: ['div[style*="width:10px;height:11px"]', 'section[aria-label="Skills and about me"]'],
  site: ['[data-pupil]', '.marquee'],
};

// Selectors differ between the prototype and the build; the rest of the flow is shared.
const DRIVER = {
  design: {
    guestbookField: 'input[aria-label="Your message"]',
    marquee: 'section[aria-label="Skills and about me"]',
  },
  site: { guestbookField: '#guestbook-body', marquee: '.marquee' },
};

export async function runCompare({ browser, designUrl, siteUrl, outDir, viewports, only, errors }) {
  const wanted = (name) => only.length === 0 || only.some((token) => name.includes(token));
  if (only.length === 0) {
    for (const file of readdirSync(outDir)) {
      if (file.endsWith('.png')) rmSync(`${outDir}/${file}`);
    }
  }

  async function openTarget(kind, viewport, consentStored) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
      locale: 'en-US',
    });
    if (consentStored) {
      await context.addInitScript(() => localStorage.setItem('jl-cookies', 'essential'));
    }
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(`${kind} ${viewport.tag}: ${error.message}`));
    if (kind === 'design') {
      await page.goto(designUrl);
      await page.waitForSelector('#top', { timeout: 20_000 });
      await page.waitForTimeout(1500);
    } else {
      await page.goto(siteUrl);
      await page.waitForSelector('#guestbook', { state: 'attached' });
      await page.waitForTimeout(1000);
    }
    await page.evaluate(() => document.fonts.ready);
    return { context, page };
  }

  // Both images go onto one canvas page and are screenshotted, so no image library is needed.
  const composer = await (await browser.newContext()).newPage();
  async function sideBySide(name, designPng, sitePng) {
    const uri = (png) => `data:image/png;base64,${png.toString('base64')}`;
    await composer.setContent(
      `<body style="margin:0;background:#888;display:flex;gap:12px;align-items:flex-start">` +
        `<img src="${uri(designPng)}"><img src="${uri(sitePng)}"></body>`,
    );
    await composer.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    );
    await composer.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  }

  // Runs `steps` against both targets; `snap(label)` pairs the two screenshots by label.
  async function pair(viewport, steps, { setup, consentStored = true } = {}) {
    const shots = { design: new Map(), site: new Map() };
    for (const kind of ['design', 'site']) {
      const { context, page } = await openTarget(kind, viewport, consentStored);
      const snap = async (label) => {
        await page.waitForTimeout(450);
        const masks = MASK[kind].map((selector) => page.locator(selector));
        shots[kind].set(label, await page.screenshot({ mask: masks, maskColor: '#ff00ff' }));
      };
      try {
        if (setup) await setup(page, kind);
        await steps(page, snap, DRIVER[kind]);
      } catch (error) {
        errors.push(`${kind} ${viewport.tag}: ${String(error.message).split('\n')[0]}`);
      }
      await context.close();
    }
    for (const [label, designPng] of shots.design) {
      const sitePng = shots.site.get(label);
      if (!sitePng) errors.push(`${label}: missing implementation screenshot`);
      else if (wanted(label)) await sideBySide(label, designPng, sitePng);
    }
  }

  const scrollTo = (page, id) =>
    page.evaluate((sectionId) => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'instant' });
    }, id);

  for (const viewport of viewports) {
    await pair(viewport, async (page, snap) => {
      await snap(`${viewport.tag}-hero`);
      const { top, height } = await page.evaluate(() => {
        const section = document.getElementById('experience');
        return {
          top: section.getBoundingClientRect().top + window.scrollY,
          height: section.offsetHeight,
        };
      });
      // The prototype shows the compact (non-pinned) experience layout only at 768 px.
      if (viewport.width !== 768) {
        for (const [step, fraction] of [
          [1, 0.15],
          [2, 0.5],
          [3, 0.85],
        ]) {
          await page.evaluate(
            (y) => window.scrollTo(0, y),
            top + (height - viewport.height) * fraction,
          );
          await snap(`${viewport.tag}-experience-step${step}`);
        }
      } else {
        await page.evaluate((y) => window.scrollTo(0, y), top);
        await snap(`${viewport.tag}-experience-compact`);
      }
      for (const id of ['projects', 'skills', 'guestbook', 'contact']) {
        await scrollTo(page, id);
        await snap(`${viewport.tag}-${id}`);
      }
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await snap(`${viewport.tag}-footer`);
    });
  }

  const desktop = viewports[0];
  const mobile = viewports[3];

  await pair(desktop, (page, snap) => snap('desktop-1440-hero-with-cookie-banner'), {
    consentStored: false,
  });

  await pair(
    desktop,
    async (page, snap, driver) => {
      await scrollTo(page, 'guestbook');
      await page.fill(driver.guestbookField, 'Hello from the comparison tool');
      await snap('desktop-1440-guestbook-typing');
      await page.click('button:has-text("Leave a mark")');
      await snap('desktop-1440-guestbook-modal');
      await page.keyboard.press('Escape');

      await scrollTo(page, 'contact');
      await page.click('button:has-text("Send message")');
      await snap('desktop-1440-contact-errors');
      await page.fill('input[name=name]', 'Jane Doe');
      await page.fill('input[name=email]', 'jane@company.com');
      await page.fill('textarea[name=message]', 'I would love to talk about a project.');
      await page.click('button:has-text("Send message")');
      await snap('desktop-1440-contact-loading');
      await page.waitForTimeout(2300);
      await snap('desktop-1440-contact-success');
    },
    {
      setup: async (page, kind) => {
        if (kind !== 'site') return;
        // Hold the response so the loading state is visible, like the prototype's fake delay.
        await page.route('**/api/contact*', async (route) => {
          await new Promise((done) => setTimeout(done, 1800));
          await route.continue();
        });
      },
    },
  );

  await pair(mobile, async (page, snap) => {
    await page.click('button[aria-label="Open menu"]');
    await snap('mobile-390-menu-open');
  });

  await pair(desktop, async (page, snap, driver) => {
    await page.evaluate(
      (selector) =>
        document.querySelector(selector)?.scrollIntoView({ block: 'center', behavior: 'instant' }),
      driver.marquee,
    );
    await snap('desktop-1440-marquee-reduced-motion');
  });

  await composer.context().close();
}
