import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITE = 'http://localhost:8787';
const API = 'http://localhost:3000';

// Playwright loads this file in the runner and in every worker; the first load creates the
// temp DB directory and workers inherit it through the environment.
const existingDbDir = process.env.E2E_DB_DIR;
const dbDir = existingDbDir ?? mkdtempSync(join(tmpdir(), 'portfolio-e2e-'));
if (existingDbDir === undefined) {
  process.env.E2E_DB_DIR = dbDir;
  process.on('exit', () => {
    try {
      rmSync(dbDir, { recursive: true, force: true });
    } catch {
      // Best effort: the directory lives in the OS temp folder, never in the repo.
    }
  });
}
const dbPath = join(dbDir, 'e2e.db');

// Never adopt a server that is already listening: a dev API with the real .env would make the
// results wrong and could touch a dev database. Opt in explicitly with E2E_REUSE=1.
const reuseServers = process.env.E2E_REUSE === '1';

// CI on Linux runs the same suite against real `wrangler dev`; it crashes on some Windows builds.
const edgeScript = process.env.E2E_EDGE === 'wrangler' ? 'preview:edge:wrangler' : 'preview:edge';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  outputDir: 'test-results',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? undefined : 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: SITE, trace: 'on-first-retry' },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
    // Opt-in (nightly): E2E_FIREFOX=1 pnpm test:e2e --project=firefox
    ...(process.env.E2E_FIREFOX
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: 'node apps/server/src/main.ts',
      url: `${API}/api/health`,
      reuseExistingServer: reuseServers,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        PORT: '3000',
        LOG_LEVEL: 'warn',
        MODERATION_PROVIDER: 'fake',
        SUITABILITY_PROVIDER: 'fake',
        MAILER: 'console',
        HUMAN_VERIFIER: 'fake',
        CONTACT_PHONE: '+48000000000',
        DATABASE_PATH: dbPath,
        CORS_ALLOWED_ORIGINS: SITE,
        CLIENT_IP_SOURCE: 'socket',
      },
    },
    {
      command: `pnpm --filter @portfolio/web exec astro build && pnpm --filter @portfolio/web ${edgeScript}`,
      url: SITE,
      reuseExistingServer: reuseServers,
      timeout: 240_000,
      env: { PUBLIC_API_BASE_URL: API, PUBLIC_SITE_URL: SITE },
    },
  ],
});
