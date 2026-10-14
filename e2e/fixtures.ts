import { test as base, expect } from '@playwright/test';

/**
 * Shared fixture (agent-instructions §12.2 #12, F-01/F-02): every request a page makes must stay on the
 * page's own origin. Third-party requests are aborted and fail the test. Tests may also register
 * strings (e.g. the child's nickname) that must never appear in any request URL or body.
 */
interface Guard {
  forbid(text: string): void;
}

export const test = base.extend<{ networkGuard: Guard }>({
  networkGuard: [
    async ({ context, baseURL }, use) => {
      const origin = new URL(baseURL ?? 'http://localhost').origin;
      const offenders: string[] = [];
      const forbidden: string[] = [];
      await context.route('**/*', async (route) => {
        const req = route.request();
        const url = req.url();
        if (!/^https?:|^wss?:/.test(url) || new URL(url).origin === origin) {
          const hay = `${decodeURIComponent(url)}\n${req.postData() ?? ''}`;
          for (const f of forbidden) if (hay.includes(f)) offenders.push(`request contains "${f}": ${req.method()} ${url}`);
          await route.fallback();
          return;
        }
        offenders.push(`third-party request: ${req.method()} ${url}`);
        await route.abort('blockedbyclient');
      });
      // WebSockets are not routed by context.route; vite's HMR socket is same-origin and anything else fails.
      context.on('page', (page) => {
        page.on('websocket', (ws) => {
          if (new URL(ws.url()).host !== new URL(origin).host) offenders.push(`third-party websocket: ${ws.url()}`);
        });
        // Uncaught exceptions are bugs even when the error boundary hides them.
        page.on('pageerror', (err) => offenders.push(`uncaught page error: ${err.message}`));
        page.on('console', (msg) => {
          // Blocked third-party requests are already reported above.
          if (msg.type() === 'error' && !msg.text().includes('ERR_BLOCKED_BY_CLIENT')) offenders.push(`console error: ${msg.text().slice(0, 500)}`);
        });
      });
      await use({ forbid: (t) => forbidden.push(t) });
      expect(offenders, 'no third-party requests and no personal data in requests').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
