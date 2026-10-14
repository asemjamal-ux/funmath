import { expect, test } from './fixtures';
import { completeLesson, dismissCelebrations, firstRun, readStore } from './helpers';

// agent-instructions §12.2 #10 / NFR-02: load once, go offline, complete a Lesson and a Game.
// Runs against the production build (`vite preview`) with the real service worker.

// Floating bubbles never settle for a pointer click; reduced motion gives the static layout (same game logic).
test.use({ reducedMotion: 'reduce' });

test('10 · offline after first load: Lesson and Bubble Pop still work', async ({ page, context }) => {
  await firstRun(page, 'en');
  // First visit installs the service worker; it controls pages from the next load on.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  // A full navigation while offline is served from the precache (app shell + route chunks).
  await page.goto('/en/lesson/ADD-01');
  await expect(page.locator('.offline-badge')).toBeVisible();
  await completeLesson(page, 'ADD-01');
  await dismissCelebrations(page);

  await page.goto('/en/games/bubble-pop?skill=ADD-01');
  const summary = page.locator('.summary__title');
  for (let i = 0; i < 60 && !(await summary.isVisible()); i++) {
    const bubble = page.locator('.bubble-btn:not([aria-disabled]):not(.bubble-btn--pop)').first();
    if (!(await bubble.count()) || (await page.locator('.bubble-btn--pop').count())) {
      await page.waitForTimeout(100);
      continue;
    }
    await bubble.click();
    await page.waitForTimeout(50);
  }
  await expect(summary).toBeVisible();
  const sessions = await readStore<{ activity: string; completed: boolean }>(page, 'sessions');
  expect(sessions.some((s) => s.activity === 'game' && s.completed)).toBe(true);
  await context.setOffline(false);
});
