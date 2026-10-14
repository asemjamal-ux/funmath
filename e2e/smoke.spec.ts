import { expect, test } from './fixtures';
import { answer, firstRun, next, runnerState } from './helpers';

// Cross-device smoke (agent-instructions §12.1): first run in both locales and one answered item.
for (const locale of ['en', 'ar'] as const) {
  test(`smoke · first run and one practice item (${locale})`, async ({ page }) => {
    await firstRun(page, locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await page.goto(`/${locale}/practice/ADD-01`);
    await answer(page, 'right');
    await next(page);
    expect((await runnerState(page)).results).toHaveLength(1);
  });
}
