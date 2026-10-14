import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import {
  activeProfileId, answer, completeLesson, currentItem, debugSet, dismissCelebrations, finishSetCorrectly, firstRun, next,
  passGate, progressOf, readStore, runnerState, seeds, setDayOffset, tabTo,
} from './helpers';

// agent-instructions §12.2 — required E2E scenarios. #10 (offline) lives in offline.spec.ts because it needs the
// production service worker; #12 (no third-party requests) is enforced for every test by the fixture.

const WESTERN = /[0-9]/;
const EASTERN = /[٠-٩]/;

/** Text inside `main`, excluding nodes explicitly marked lang="en" (§12.3). */
async function mainText(page: Page): Promise<string> {
  return page.locator('main').evaluate((m) => {
    const clone = m.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[lang="en"], .visually-hidden[aria-hidden="true"]').forEach((n) => n.remove());
    return clone.textContent ?? '';
  });
}

async function localDate(page: Page, plusDays: number): Promise<string> {
  return page.evaluate((d) => {
    const off = Number(localStorage.getItem('oasis.dev.dayOffset') ?? 0);
    const x = new Date(Date.now() + (off + d) * 86_400_000);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  }, plusDays);
}

test('1 · first run in Arabic: welcome → gate → profile → Home is RTL with Eastern Arabic digits', async ({ page, networkGuard }) => {
  networkGuard.forbid('سامي');
  await page.goto('/');
  // Bilingual welcome: two equal language buttons, nothing else required.
  await expect(page.locator('.welcome__lang')).toHaveCount(2);
  await firstRun(page, 'ar');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.world-picker .world-chip:not(.world-chip--mix)')).toHaveCount(4);
  const text = await mainText(page);
  expect(text).toMatch(EASTERN);
  expect(text).not.toMatch(WESTERN);
  const profile = (await readStore<{ prefs: { numberStyle: string; mathDirection: string } }>(page, 'profiles'))[0]!;
  expect(profile.prefs).toMatchObject({ numberStyle: 'arab', mathDirection: 'rtl' });
});

test('2 · first run in English → ADD-01 Lesson → Star 1 → TR-01 awarded once', async ({ page, networkGuard }) => {
  networkGuard.forbid('Sami');
  await firstRun(page, 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.goto('/en/skill/ADD-01');
  await page.locator('.skill-page__actions .btn').first().click();
  await expect(page).toHaveURL(/\/en\/lesson\/ADD-01$/);
  await completeLesson(page, 'ADD-01');
  expect((await progressOf(page, 'ADD-01'))?.stars).toBe(1);
  expect(await seeds(page)).toBe(5);
  // The trophy celebration waits for the Ready step, then shows exactly once.
  await expect(page.locator('dialog[open]')).toBeVisible();
  expect(await dismissCelebrations(page)).toBe(1);
  let awards = await readStore<{ trophyId: string }>(page, 'trophyAwards');
  expect(awards.filter((a) => a.trophyId === 'TR-01')).toHaveLength(1);

  // Replaying the Lesson credits Seeds again (decision 11) but never a second TR-01.
  await page.locator('.lesson-ready .btn').last().click();
  await page.locator('.skill-page__actions .btn').first().click();
  await completeLesson(page, 'ADD-01');
  await page.waitForTimeout(300);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  awards = await readStore<{ trophyId: string }>(page, 'trophyAwards');
  expect(awards.filter((a) => a.trophyId === 'TR-01')).toHaveLength(1);
  expect((await progressOf(page, 'ADD-01'))?.stars).toBe(1);
});

test('3 · Practice ADD-04: 3 first-try correct → Tier up; 2 incorrect → Tier down', async ({ page }) => {
  await firstRun(page, 'en');
  await debugSet(page, 'ADD-03', { stars: 2 }); // unlocks ADD-04 (PRD §6.9)
  await page.goto('/en/practice/ADD-04');
  expect((await currentItem(page)).tier).toBe(1);
  for (let i = 0; i < 3; i++) {
    await answer(page, 'right');
    await next(page);
  }
  expect((await runnerState(page)).tierState?.tier).toBe(2);
  expect((await currentItem(page)).tier).toBe(2);
  await expect.poll(async () => (await progressOf(page, 'ADD-04'))?.currentTier).toBe(2);
  for (let i = 0; i < 2; i++) {
    await answer(page, 'wrong');
    await expect(page.locator('.hint')).toBeVisible(); // Hint 1 after the first wrong attempt
    await answer(page, 'wrong');
    await expect(page.locator('.worked')).toBeVisible();
    await next(page);
  }
  expect((await runnerState(page)).tierState?.tier).toBe(1);
  await expect.poll(async () => (await progressOf(page, 'ADD-04'))?.currentTier).toBe(1);
});

test('4 · wrong twice → Worked Example → similar item re-queued; set length ≤ 12', async ({ page }) => {
  await firstRun(page, 'en');
  await page.goto('/en/practice/ADD-01');
  const start = await runnerState(page);
  const startLen = start.items.length + start.pending.length;
  expect(startLen).toBe(8); // Stage 1 Skill
  await answer(page, 'wrong');
  await expect(page.locator('main [role="radio"][aria-disabled="true"]')).toHaveCount(1); // wrong option greyed
  await answer(page, 'wrong');
  await expect(page.locator('.worked')).toBeVisible();
  let s = await runnerState(page);
  expect(s.items.length + s.pending.length).toBe(startLen + 1);
  const missed = s.items[0]!;
  await next(page);
  // The re-queued similar item comes back within the next few items with the same operation and Tier.
  s = await runnerState(page);
  expect((s.pending as { requeue?: unknown }[]).some((p) => p.requeue)).toBe(true);

  // Missing every item never grows the set past 12.
  for (let i = 0; i < 20; i++) {
    s = await runnerState(page);
    if (s.phase === 'summary') break;
    await answer(page, 'wrong');
    await answer(page, 'wrong');
    await next(page);
  }
  s = await runnerState(page);
  expect(s.phase).toBe('summary');
  expect(s.items.length).toBeLessThanOrEqual(12);
  expect(s.items.length).toBeGreaterThan(startLen);
  expect(s.items.slice(1).some((it) => it.operation === missed.operation && it.tier === missed.tier)).toBe(true);
});

test('5 · Star 2 on ADD-05 → Multiplication World unlocks', async ({ page }) => {
  await firstRun(page, 'en');
  await debugSet(page, 'ADD-04', { stars: 2 }); // ADD-05 unlocked, Multiplication still closed
  await page.goto('/en/home');
  const mulCard = page.locator('.world-chip:not(.world-chip--mix)').nth(2);
  await expect(mulCard.locator('a.world-chip__link')).toHaveCount(0);
  await page.goto('/en/practice/ADD-05');
  const summary = await finishSetCorrectly(page);
  expect(summary.starsAfter).toBe(2);
  await dismissCelebrations(page);
  expect((await progressOf(page, 'ADD-05'))?.stars).toBe(2);
  await page.locator('.summary__actions .btn').last().click();
  await expect(page).toHaveURL(/\/en\/home$/);
  await dismissCelebrations(page);
  await expect(mulCard.locator('a.world-chip__link')).toHaveAttribute('href', '/en/world/multiplication');
  await mulCard.locator('a.world-chip__link').click();
  await expect(page).toHaveURL(/\/en\/world\/multiplication$/);
});

test('6 · mastery across two simulated days → Star 3 → review in 7 days', async ({ page }) => {
  await firstRun(page, 'en');
  await setDayOffset(page, 0);
  await debugSet(page, 'ADD-01', { tier: 3, stars: 2 });
  await page.goto('/en/practice/ADD-01');
  await finishSetCorrectly(page);
  await dismissCelebrations(page);
  let p = await progressOf(page, 'ADD-01');
  expect(p?.stars).toBe(2);
  expect(p?.tier3QualifyingDates).toEqual([await localDate(page, 0)]);

  // Same day again does not count twice.
  await page.locator('.summary__actions .btn').first().click();
  await finishSetCorrectly(page);
  await dismissCelebrations(page);
  expect((await progressOf(page, 'ADD-01'))?.stars).toBe(2);

  // Next calendar day (dev clock offset) → Star 3, review scheduled +7 days.
  await page.locator('.summary__actions .btn').last().click();
  await expect(page).toHaveURL(/\/en\/home$/);
  await setDayOffset(page, 1);
  await page.goto('/en/practice/ADD-01');
  const summary = await finishSetCorrectly(page);
  expect(summary.starsAfter).toBe(3);
  p = await progressOf(page, 'ADD-01');
  expect(p?.stars).toBe(3);
  expect(p?.masteredAt).toBe(await localDate(page, 0));
  expect(p?.nextReviewAt).toBe(await localDate(page, 7));
  await setDayOffset(page, 0);
});

test('4b · a finished set is not resumed after browser Back; the next visit starts a new set', async ({ page }) => {
  await firstRun(page, 'en');
  await page.locator('.hero-actions a').first().click();
  await expect(page).toHaveURL(/\/en\/skill\/ADD-01$/);
  await page.locator('.skill-page__actions .btn').nth(1).click();
  const first = await runnerState(page);
  await finishSetCorrectly(page);
  await dismissCelebrations(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/skill\/ADD-01$/);
  await page.locator('.skill-page__actions .btn').nth(1).click();
  const again = await runnerState(page);
  expect(again.phase).toBe('answering');
  expect(again.sessionId).not.toBe(first.sessionId);
  expect(again.results).toHaveLength(0);
});

test('7 · switch language mid-Practice → same item and attempts, new digits and direction', async ({ page, networkGuard }) => {
  networkGuard.forbid('Sami');
  await firstRun(page, 'en');
  await page.goto('/en/practice/ADD-01');
  await answer(page, 'right');
  await next(page);
  await answer(page, 'wrong');
  const before = await runnerState(page);
  const seedsBefore = await seeds(page);
  await expect(page.locator('main .math-expr').first()).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('main [role="radio"]').first()).toHaveText(WESTERN);

  await page.locator('.lang-switch').click();
  await expect(page).toHaveURL(/\/ar\/practice\/ADD-01$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const after = await runnerState(page);
  expect(after.sessionId).toBe(before.sessionId);
  expect(after.items).toEqual(before.items);
  expect(after.results).toEqual(before.results);
  expect(after.answer).toEqual(before.answer);
  await expect(page.locator('main .math-expr').first()).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main [role="radio"]').first()).toHaveText(EASTERN);
  expect(await mainText(page)).not.toMatch(WESTERN);
  expect(await seeds(page)).toBe(seedsBefore);

  // Finishing the item in Arabic continues the same set.
  await answer(page, 'right');
  const done = await runnerState(page);
  expect(done.results).toHaveLength(2);
  expect(done.results[1]).toMatchObject({ correct: true, firstTry: false });
});

test('8 · reload mid-set → answered items persisted, Seeds not duplicated', async ({ page }) => {
  await firstRun(page, 'en');
  await page.goto('/en/practice/ADD-01');
  for (let i = 0; i < 3; i++) {
    await answer(page, 'right');
    await next(page);
  }
  await answer(page, 'right'); // 4th item correct, "Next" not pressed yet
  const before = await runnerState(page);
  expect(await seeds(page)).toBe(4);
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  const after = await runnerState(page);
  expect(after.sessionId).toBe(before.sessionId);
  expect(after.results).toEqual(before.results);
  expect(after.phase).toBe('correct');
  expect(await seeds(page)).toBe(4);
  expect(await readStore(page, 'itemResponses')).toHaveLength(4);
  await next(page);
  await answer(page, 'right');
  expect(await seeds(page)).toBe(5);
  await page.reload();
  expect(await seeds(page)).toBe(5);
  expect(await readStore(page, 'itemResponses')).toHaveLength(5);
});

test('9 · keyboard only: a Practice Set and a Lesson with manipulatives', async ({ page }) => {
  await firstRun(page, 'en');
  await page.goto('/en/skill/ADD-01');
  await tabTo(page, page.locator('.skill-page__actions .btn').first());
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/en\/lesson\/ADD-01$/);
  await completeLesson(page, 'ADD-01', 'keyboard');
  expect((await progressOf(page, 'ADD-01'))?.stars).toBe(1);
  // The trophy dialog is a modal: Enter on its focused button closes it.
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  // Practice: choice tiles (roving focus + arrows) at Tiers 1–2, number entry by typing at Tier 3.
  await tabTo(page, page.locator('.lesson-ready .btn').first());
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/en\/practice\/ADD-01$/);
  const summary = await finishSetCorrectly(page, 'keyboard');
  expect(summary).toMatchObject({ correct: 8, total: 8 });
  const formats = new Set((await runnerState(page)).items.map((i) => i.format));
  expect(formats).toEqual(new Set(['choice', 'entry']));
});

test('11 · Grown-ups: Number Style → learner screens update; export → delete → import → identical data', async ({ page, networkGuard }) => {
  networkGuard.forbid('سامي');
  await firstRun(page, 'ar');
  const id = await activeProfileId(page);
  await page.goto('/ar/lesson/ADD-01');
  await completeLesson(page, 'ADD-01');
  await dismissCelebrations(page);
  await page.goto('/ar/home');
  expect(await mainText(page)).not.toMatch(WESTERN);

  // Number Style → Western: the learner Home now shows 0–9.
  await page.goto('/ar/grown-ups');
  await passGate(page, 'ar');
  const nav = page.locator('.grownups__navlink');
  await nav.nth(2).click();
  await page.locator('select:has(option[value="latn"])').selectOption('latn');
  await expect.poll(async () => (await readStore<{ prefs: { numberStyle: string } }>(page, 'profiles'))[0]?.prefs.numberStyle).toBe('latn');
  await page.locator('.topbar .btn').first().click();
  await expect(page).toHaveURL(/\/ar\/home$/);
  const latnText = await mainText(page);
  expect(latnText).toMatch(WESTERN);
  expect(latnText).not.toMatch(EASTERN);

  // Export.
  const dump = async () => {
    const stores = ['profiles', 'skillProgress', 'itemResponses', 'sessions', 'rewards', 'seedLedger', 'trophyAwards', 'counters'];
    const out: Record<string, unknown[]> = {};
    for (const s of stores) {
      const rows = (await readStore<Record<string, unknown>>(page, s)).map(({ id: rowId, ...rest }) => (s === 'itemResponses' ? rest : { id: rowId, ...rest }));
      out[s] = rows.map((r) => JSON.stringify(r)).sort();
    }
    return out;
  };
  const original = await dump();
  expect(original.trophyAwards!.length).toBeGreaterThan(0);
  await page.goto('/ar/grown-ups');
  await passGate(page, 'ar');
  await nav.nth(3).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.gu-profile .btn').first().click()]);
  const file = await download.path();
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(backup.data.profile.id).toBe(id);

  // Delete the profile.
  await nav.nth(1).click();
  await page.locator('main .btn--danger').first().click();
  await page.locator('dialog[open] .dialog__actions .btn').last().click();
  await expect.poll(async () => (await readStore(page, 'profiles')).length).toBe(0);
  expect(await readStore(page, 'itemResponses')).toHaveLength(0);

  // Import → identical data.
  await nav.nth(3).click();
  await page.locator('main input[type="file"]').setInputFiles(file);
  await expect.poll(async () => (await readStore(page, 'profiles')).length).toBe(1);
  expect(await dump()).toEqual(original);
});
