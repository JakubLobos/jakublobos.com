// Renders the dev-only /__og/<locale> pages into apps/web/public/og/og-<locale>.png (1200 × 630).
//
// Usage: pnpm og:generate   (starts `astro dev` on a free port, or reuses OG_BASE_URL if set)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const LOCALES = ['en', 'pl'] as const;
const SIZE = { width: 1200, height: 630 };
const MAX_BYTES = 300 * 1024;

const rootDir = fileURLToPath(new URL('../../', import.meta.url));
const outDir = `${rootDir}apps/web/public/og`;

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => {
        resolve(port);
      });
    });
  });
}

function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      resolve(false);
    });
  });
}

// Only waits for the port: the first page request compiles the route, and goto() waits for that.
async function waitUntilListening(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canConnect(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server did not start on port ${port}`);
}

async function startDevServer(): Promise<{ baseUrl: string; stop: () => void }> {
  const port = await freePort();
  const astro = `${rootDir}apps/web/node_modules/astro/bin/astro.mjs`;
  const child = spawn(
    process.execPath,
    [astro, 'dev', '--port', String(port), '--host', '127.0.0.1'],
    { cwd: `${rootDir}apps/web`, stdio: 'ignore' },
  );
  const stop = () => {
    // On Windows a plain kill() leaves no children here (astro dev is one process), but /T is cheap insurance.
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill();
    }
  };
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitUntilListening(port, 120_000);
  return { baseUrl, stop };
}

const external = process.env.OG_BASE_URL;
const server = external ? { baseUrl: external, stop: () => undefined } : await startDevServer();
const browser = await chromium.launch();
try {
  mkdirSync(outDir, { recursive: true });
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  for (const locale of LOCALES) {
    await page.goto(`${server.baseUrl}/__og/${locale}`, { waitUntil: 'load' });
    // Astro's dev toolbar floats over the bottom edge of every dev page.
    await page.addStyleTag({ content: 'astro-dev-toolbar { display: none !important; }' });
    // The display font is the headline; a fallback face here would silently ship a wrong image.
    await page.evaluate('document.fonts.ready.then(() => undefined)');
    const loaded = await page.evaluate(
      `[...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family)`,
    );
    if (
      !Array.isArray(loaded) ||
      !loaded.some((family) => String(family).includes('Rubik Doodle'))
    ) {
      throw new Error(`Display font did not load for ${locale}`);
    }
    const file = `${outDir}/og-${locale}.png`;
    const png = await page.screenshot({ path: file, clip: { x: 0, y: 0, ...SIZE } });
    if (png.byteLength > MAX_BYTES)
      throw new Error(`${file} is ${png.byteLength} bytes (max ${MAX_BYTES})`);
    console.log(`og-${locale}.png ${png.byteLength} bytes`);
  }
} finally {
  await browser.close();
  server.stop();
}
