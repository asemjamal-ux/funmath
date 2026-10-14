import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { answer, completeLesson, currentItem, dismissCelebrations, firstRun, next, passGate, runnerState, spa } from './helpers';

/*
 * Visual regression matrix (agent-instructions §12.5), against the production bundle:
 *   { en, ar-arab-rtl, ar-latn-ltr } × { 360×780, 820×1180, 1280×800 } × { default, reduced-motion } final frames.
 * Determinism: Math.random is seeded (items, game rounds, confetti) and the clock starts at a fixed instant.
 * Update baselines after an approved visual change with `npm run test:visual -- --update-snapshots`.
 */

const VIEWPORTS = [
  { width: 360, height: 780 },
  { width: 820, height: 1180 },
  { width: 1280, height: 800 },
];
const VARIANTS = [
  { name: 'en', locale: 'en', opts: {} },
  { name: 'ar-arab-rtl', locale: 'ar', opts: { numberStyle: 'arab', mathDirection: 'rtl' } },
  { name: 'ar-latn-ltr', locale: 'ar', opts: { numberStyle: 'latn', mathDirection: 'ltr' } },
] as const;

async function seedRandomness(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-10-15T09:00:00+04:00') });
  await page.addInitScript(() => {
    let a = 0x2f6b4c1d;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
}

for (const motion of ['default', 'reduced'] as const) {
  for (const v of VARIANTS) {
    test.describe(`${v.name} · ${motion} motion`, () => {
      test.use({ reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' });

      test(`visual matrix · ${v.name} · ${motion}`, async ({ page }) => {
        test.setTimeout(300_000);
        const L = (p: string) => `/${v.locale}${p}`;
        const shoot = async (name: string) => {
          await page.waitForLoadState('networkidle');
          await page.evaluate(() => document.fonts.ready);
          for (const vp of VIEWPORTS) {
            await page.setViewportSize(vp);
            await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
            await page.waitForTimeout(100);
            await expect.soft(page).toHaveScreenshot(`${v.name}-${motion}-${name}-${vp.width}x${vp.height}.png`, { fullPage: true });
          }
          await page.setViewportSize(VIEWPORTS[2]!);
        };

        await seedRandomness(page);
        await firstRun(page, v.locale, { nickname: v.locale === 'ar' ? 'سامي' : 'Sami', stage: 3, ...v.opts });
        await shoot('home');
        await spa(page, L('/world/addition'));
        await shoot('world');
        await spa(page, L('/skill/ADD-01'));
        await shoot('skill');

        await spa(page, L('/lesson/ADD-01'));
        await completeLesson(page, 'ADD-01', 'mouse', async (kind, i) => {
          if (kind === 'model' || (kind === 'guided' && i === 2)) await shoot(`lesson-${kind}`);
        });
        await shoot('lesson-ready-celebration');
        await dismissCelebrations(page);

        // Practice: choice, feedback states, number entry, summary (ADD-01); column entry (ADD-07).
        await spa(page, L('/practice/ADD-01'));
        await runnerState(page);
        await shoot('practice-choice');
        await answer(page, 'wrong');
        await shoot('feedback-try-again');
        await answer(page, 'right');
        await shoot('feedback-correct');
        await next(page);
        for (let i = 0; i < 10 && (await currentItem(page)).format !== 'entry'; i++) {
          await answer(page, 'right');
          await next(page);
        }
        await shoot('practice-number-entry');
        for (let i = 0; i < 12 && (await runnerState(page)).phase !== 'summary'; i++) {
          if ((await runnerState(page)).phase === 'answering') await answer(page, 'right');
          await next(page);
        }
        await dismissCelebrations(page);
        await shoot('practice-summary');

        await spa(page, L('/practice/ADD-07'));
        for (let i = 0; i < 6 && (await currentItem(page)).format !== 'column'; i++) {
          await answer(page, 'right');
          await next(page);
        }
        await shoot('practice-column-entry');
        await page.locator('.topbar .icon-btn').first().click();
        await page.locator('dialog[open] .dialog__actions .btn').last().click();

        for (const g of ['bubble-pop', 'number-line-hop', 'match-pairs']) {
          await spa(page, L(`/games/${g}?skill=ADD-01`));
          await expect(page.locator('.game__title')).toBeVisible();
          await shoot(`game-${g}`);
        }
        await spa(page, L('/trophies'));
        await shoot('trophy-room');
        await spa(page, L('/worksheets'));
        await expect(page.locator('.ws-title')).toBeVisible();
        await shoot('worksheets');

        await spa(page, L('/grown-ups'));
        await passGate(page, v.locale);
        await page.locator('main a[href*="/grown-ups/report/"]').first().click();
        await expect(page.locator('main h1')).toBeVisible();
        await shoot('grown-ups-report');
      });
    });
  }
}
