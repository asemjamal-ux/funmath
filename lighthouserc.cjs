// Lighthouse CI (agent-instructions §12.1, PRD NFR-01) against the production bundle served by `vite preview`.
// Budgets: LCP ≤ 2.5 s (mid-range Android CPU over 4G, see `throttling`), Total Blocking Time ≤ 200 ms as the lab
// proxy for INP ≤ 200 ms (INP needs real interactions), CLS ≤ 0.1; initial JS ≤ 200 KB gzipped via scripts/lhci-js-budget.mjs.
// Learner routes need a profile and an active-profile session; scripts/lhci-setup.cjs creates both through the UI.
const { chromium } = require('@playwright/test');

const PORT = 4184;
const base = `http://localhost:${PORT}`;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npx vite preview --port ${PORT} --strictPort`,
      startServerReadyPattern: 'Local',
      url: [`${base}/en/home`, `${base}/en/practice/ADD-01`, `${base}/en/lesson/ADD-01`, `${base}/ar/home`],
      numberOfRuns: Number(process.env.LHCI_RUNS ?? 3),
      chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
      puppeteerScript: 'scripts/lhci-setup.cjs',
      puppeteerLaunchOptions: { args: ['--no-sandbox'] },
      settings: {
        // Lighthouse's default reset clears the HTTP cache, service workers and Cache Storage (a true cold load) but keeps
        // IndexedDB, so the profile survives; the setup script restores the per-tab active profile.
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        // NFR-01 "mid-range Android over 4G": 4× CPU slowdown (Lighthouse's mid-tier mobile) on a regular 4G link
        // (WebPageTest "4G": 9 Mbps, 170 ms RTT). Lighthouse's default is *slow* 4G (1.6 Mbps) — see decision 001 #18.
        throttling: { rttMs: 170, throughputKbps: 9000, cpuSlowdownMultiplier: 4, requestLatencyMs: 170 * 3.75, downloadThroughputKbps: 9000 * 0.9, uploadThroughputKbps: 9000 * 0.9 },
        // Local antivirus web shields (e.g. Kaspersky) inject their own script into every page; it is not the app.
        blockedUrlPatterns: ['*kaspersky-labs.com*'],
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'median-run' }],
        'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median-run' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median-run' }],
        // Initial JS ≤ 200 KB gzipped is checked by scripts/lhci-js-budget.mjs (body bytes, not headers).
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'errors-in-console': 'error',
        'is-on-https': 'off', // local preview server
        'redirects-http': 'off',
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
