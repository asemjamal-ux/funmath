import { defineConfig, devices } from '@playwright/test';

/*
 * Browser test layers (agent-instructions §12.1):
 *  - e2e      → journeys against the Vite dev server (the dev clock offset `oasis.dev.dayOffset` only works in dev builds)
 *  - offline  → service-worker journey against `npm run preview` (production bundle + production CSP)
 *  - a11y     → axe-core, digit scan and target-size checks against the production bundle
 *  - visual   → screenshot matrix (§12.5) against the production bundle
 * Every project uses the `test` export from e2e/fixtures.ts, which fails on any non-same-origin request (§12.2 #12).
 *
 * Extra engines/devices from §12.1 (Firefox, WebKit, iPad) run with E2E_ALL_BROWSERS=1 after `npx playwright install`.
 */
// Own ports, so a developer's `npm run dev` / `npm run preview` (5173 / 4173) is never reused by accident.
const DEV = 'http://localhost:5183';
const PREVIEW = 'http://localhost:4183';
const allBrowsers = process.env.E2E_ALL_BROWSERS === '1';

const chromium = { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 90_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' } },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'block', locale: 'en-US', timezoneId: 'Asia/Dubai' },
  projects: [
    { name: 'e2e', testMatch: /journeys\.spec\.ts/, use: { ...chromium, baseURL: DEV } },
    { name: 'e2e-pixel7', testMatch: /smoke\.spec\.ts/, use: { ...devices['Pixel 7'], baseURL: DEV } },
    { name: 'offline', testMatch: /offline\.spec\.ts/, use: { ...chromium, baseURL: PREVIEW, serviceWorkers: 'allow' } },
    { name: 'a11y', testMatch: /a11y\.spec\.ts/, use: { ...chromium, baseURL: PREVIEW } },
    { name: 'visual', testMatch: /visual\.spec\.ts/, use: { ...chromium, baseURL: PREVIEW } },
    ...(allBrowsers
      ? [
          { name: 'e2e-firefox', testMatch: /smoke\.spec\.ts/, use: { ...devices['Desktop Firefox'], baseURL: DEV } },
          { name: 'e2e-webkit', testMatch: /smoke\.spec\.ts/, use: { ...devices['Desktop Safari'], baseURL: DEV } },
          { name: 'e2e-ipad', testMatch: /smoke\.spec\.ts/, use: { ...devices['iPad (gen 7)'], baseURL: DEV } },
        ]
      : []),
  ],
  webServer: [
    { command: 'npx vite --port 5183 --strictPort', url: `${DEV}/en/`, reuseExistingServer: !process.env.CI, timeout: 60_000 },
    // Set E2E_SKIP_BUILD=1 to serve an existing dist/ (e.g. right after `npm run build`).
    {
      command: `${process.env.E2E_SKIP_BUILD === '1' ? '' : 'npm run build && '}npx vite preview --port 4183 --strictPort`,
      url: `${PREVIEW}/en/`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});
