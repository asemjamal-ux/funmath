import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';

type Locale = 'en' | 'ar';
const root = path.resolve(import.meta.dirname, '..');
const json = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) as T;

const messages: Record<Locale, Record<string, string>> = {
  en: json('src/locales/en/common.json'),
  ar: json('src/locales/ar/common.json'),
};

export interface LessonStepJson {
  kind: string;
  item?: { operands: [number, number, number]; blank: 'a' | 'b' | 'result'; choices: number[] };
  model?: { kind: string };
}
export const lessons = json<{ skillId: string; steps: LessonStepJson[] }[]>('src/content/lessons.json');

/* ---------------- Grown-up Gate ---------------- */

/** Press-and-hold 2 s (keyboard), then type the three digits whose names are shown in `.gate__words`. */
export async function passGate(page: Page, locale: Locale, onChallenge?: () => Promise<void>): Promise<void> {
  const hold = page.locator('.gate__hold');
  await hold.focus();
  await page.keyboard.down('Space');
  await expect(page.locator('.gate__words')).toBeVisible({ timeout: 5_000 });
  await page.keyboard.up('Space');
  await onChallenge?.();
  const words = (await page.locator('.gate__words').innerText()).split(messages[locale]['gate.wordSeparator']!.trim()).map((w) => w.trim());
  const byWord = new Map(Array.from({ length: 10 }, (_, d) => [messages[locale][`gate.digit.${d}`], d] as const));
  for (const w of words) {
    const d = byWord.get(w);
    if (d === undefined) throw new Error(`Unknown gate word "${w}"`);
    await padKey(page.locator('.gate .numpad'), d).click();
  }
}

/* ---------------- Keyboard ---------------- */

/** Presses Tab (then Shift+Tab) until `target` has focus — proves it is reachable by keyboard alone. */
export async function tabTo(page: Page, target: Locator, max = 60): Promise<void> {
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < max; i++) {
      if (await target.evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press(key);
    }
  }
  throw new Error(`could not reach ${target.toString()} with Tab`);
}

/* ---------------- Number pad (layout 1–9, ⌫, 0, ✓ — never mirrored) ---------------- */

export function padKey(pad: Locator, d: number): Locator {
  return pad.locator('.numpad__key').nth(d === 0 ? 10 : d - 1);
}
export function padCheck(pad: Locator): Locator {
  return pad.locator('.numpad__key').nth(11);
}

/* ---------------- First run ---------------- */

export interface ProfileOptions {
  nickname?: string;
  stage?: 1 | 2 | 3 | 4 | 5;
  /** Arabic only: Number Style / Math Direction confirmed on the profile form. */
  numberStyle?: 'arab' | 'latn';
  mathDirection?: 'rtl' | 'ltr';
}

/** Bilingual welcome → language → gate → profile form → Home. Returns the new profile id. */
export async function firstRun(page: Page, locale: Locale, opts: ProfileOptions = {}): Promise<string> {
  await page.goto('/');
  await page.locator(`.welcome__lang[lang="${locale}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/setup$`));
  await passGate(page, locale);
  await page.locator('#nickname').fill(opts.nickname ?? (locale === 'ar' ? 'سامي' : 'Sami'));
  if (opts.stage && opts.stage !== 1) await page.locator('input[name="stage"]').nth(opts.stage - 1).check();
  if (opts.numberStyle === 'latn') await page.locator('input[name="ns"]').nth(1).check();
  if (opts.mathDirection === 'ltr') await page.locator('input[name="md"]').nth(1).check();
  await page.locator('main .btn').last().click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/home$`));
  await expect(page.locator('.world-picker')).toBeVisible();
  return activeProfileId(page);
}

export async function activeProfileId(page: Page): Promise<string> {
  const id = await page.evaluate(() => sessionStorage.getItem('oasis.activeProfile'));
  if (!id) throw new Error('no active profile');
  return id;
}

/* ---------------- IndexedDB (read-only checks) ---------------- */

export async function readStore<T = Record<string, unknown>>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(
    (name) =>
      new Promise<T[]>((resolve, reject) => {
        const open = indexedDB.open('number-oasis');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction(name, 'readonly').objectStore(name).getAll();
          req.onsuccess = () => {
            resolve(req.result as T[]);
            db.close();
          };
          req.onerror = () => reject(req.error);
        };
      }),
    store,
  );
}

export interface ProgressRow {
  skillId: string;
  stars: number;
  currentTier: number;
  tier3QualifyingDates: string[];
  masteredAt?: string;
  nextReviewAt?: string;
}
export async function progressOf(page: Page, skillId: string): Promise<ProgressRow | undefined> {
  return (await readStore<ProgressRow>(page, 'skillProgress')).find((r) => r.skillId === skillId);
}
export async function seeds(page: Page): Promise<number> {
  const rows = await readStore<{ seeds: number }>(page, 'rewards');
  return rows[0]?.seeds ?? 0;
}

/* ---------------- Dev debug panel (dev server only) ---------------- */

/** Sets Tier and/or Stars for a Skill via the dev debug panel (agent-instructions §3). */
export async function debugSet(page: Page, skillId: string, opts: { tier?: 1 | 2 | 3; stars?: 0 | 1 | 2 | 3 }): Promise<void> {
  await page.locator('.debug-toggle').click();
  const panel = page.locator('aside.debug');
  await panel.locator('select').selectOption(skillId);
  if (opts.tier) await panel.getByRole('button', { name: `Tier ${opts.tier}`, exact: true }).click();
  if (opts.stars !== undefined) await panel.getByRole('button', { name: `${opts.stars}★`, exact: true }).click();
  if (opts.tier) await expect.poll(async () => (await progressOf(page, skillId))?.currentTier).toBe(opts.tier);
  if (opts.stars !== undefined) await expect.poll(async () => (await progressOf(page, skillId))?.stars).toBe(opts.stars);
  await panel.getByRole('button', { name: '✕' }).click();
}

/** Simulates "another calendar day" with the dev clock offset, then reloads (agent-instructions §3). */
export async function setDayOffset(page: Page, days: number): Promise<void> {
  await page.evaluate((d) => localStorage.setItem('oasis.dev.dayOffset', String(d)), days);
  await page.reload();
}

/* ---------------- Practice runner ---------------- */

export interface RunnerItem {
  format: 'choice' | 'entry' | 'column';
  operation: string;
  operands: [number, number, number];
  answer: number;
  choices?: number[];
  tier: number;
}
export interface RunnerSnapshot {
  sessionId: string;
  items: RunnerItem[];
  pending: unknown[];
  results: { correct: boolean; firstTry: boolean; tier: number }[];
  answer: { attempts: number; wrong: number[]; col: (number | null)[] };
  phase: 'answering' | 'correct' | 'worked' | 'summary';
  tierState: { tier: number } | null;
  summary?: { correct: number; total: number; seeds: number; starsBefore?: number; starsAfter?: number };
}

/** The in-progress activity state the app persists in sessionStorage (keyed by locale-free path). */
export async function runnerState(page: Page): Promise<RunnerSnapshot> {
  // The set is created in an effect right after the route mounts; wait for it.
  const handle = await page.waitForFunction(() => {
    const raw = sessionStorage.getItem('oasis.activity');
    const states = raw ? (JSON.parse(raw).state.states as Record<string, unknown>) : {};
    const pid = sessionStorage.getItem('oasis.activeProfile');
    const key = `${pid}:${location.pathname.replace(/^\/(en|ar)(?=\/|$)/, '')}`;
    return states[key] ?? null;
  }, undefined, { timeout: 10_000 });
  return (await handle.jsonValue()) as RunnerSnapshot;
}

export async function currentItem(page: Page): Promise<RunnerItem> {
  const s = await runnerState(page);
  return s.items[s.items.length - 1]!;
}

function digits(n: number): number[] {
  return String(n).split('').map(Number);
}

/** Answers the current item through the UI. `wrong` picks a plausible wrong answer. Mouse or keyboard. */
export async function answer(page: Page, kind: 'right' | 'wrong', input: 'mouse' | 'keyboard' = 'mouse'): Promise<void> {
  const before = await runnerState(page);
  const item = before.items[before.items.length - 1]!;
  let value = item.answer;
  if (kind === 'wrong') {
    if (item.format === 'choice') value = item.choices!.find((c) => c !== item.answer && !before.answer.wrong.includes(c))!;
    else value = item.answer + 1 + before.answer.attempts;
  }
  const main = page.locator('main');
  if (item.format === 'choice') {
    const idx = item.choices!.indexOf(value);
    const choice = main.locator('[role="radiogroup"] [role="radio"]').nth(idx);
    if (input === 'keyboard') {
      // Roving focus: Tab into the group lands on the first tile, arrows follow visual order.
      await tabTo(page, main.locator('[role="radiogroup"] [role="radio"]').first());
      for (let i = 0; i < idx; i++) await page.keyboard.press('ArrowDown');
      await expect(choice).toBeFocused();
      await page.keyboard.press('Enter');
    } else {
      await choice.click();
    }
  } else {
    const pad = main.locator('.numpad');
    const ds = item.format === 'column' ? digits(value).reverse() : digits(value); // column entry fills ones first
    for (const d of ds) {
      if (input === 'keyboard') await page.keyboard.press(String(d));
      else await padKey(pad, d).click();
    }
    if (input === 'keyboard') {
      await tabTo(page, padCheck(pad));
      await page.keyboard.press('Enter');
    } else await padCheck(pad).click();
  }
  // Wait until the answer was processed (attempt counted, phase changed).
  await expect
    .poll(async () => {
      const s = await runnerState(page);
      return s.results.length !== before.results.length || s.answer.attempts !== before.answer.attempts || s.phase !== before.phase;
    })
    .toBe(true);
}

/** After a correct answer or a Worked Example, moves to the next item (or the summary). */
export async function next(page: Page, input: 'mouse' | 'keyboard' = 'mouse'): Promise<void> {
  const s = await runnerState(page);
  if (s.phase === 'correct') {
    const btn = page.locator('.next-row .btn');
    if (input === 'keyboard') {
      await expect(btn).toBeFocused();
      await page.keyboard.press('Enter');
    } else await btn.click();
  } else if (s.phase === 'worked') {
    // "Next step" until "Got it" (DS §8.6); the button keeps focus between steps.
    for (let i = 0; i < 12 && (await runnerState(page)).phase === 'worked'; i++) {
      const btn = page.locator('.worked > .btn');
      if (input === 'keyboard') {
        await expect(btn).toBeFocused();
        await page.keyboard.press('Enter');
      } else await btn.click();
      await page.waitForTimeout(150);
    }
  }
  await expect.poll(async () => (await runnerState(page)).phase).not.toBe(s.phase === 'worked' ? 'worked' : 'correct');
}

/** Answers every remaining item correctly on the first try and returns the summary. */
export async function finishSetCorrectly(page: Page, input: 'mouse' | 'keyboard' = 'mouse'): Promise<NonNullable<RunnerSnapshot['summary']>> {
  for (let i = 0; i < 13; i++) {
    const s = await runnerState(page);
    if (s.phase === 'summary') break;
    if (s.phase === 'answering') await answer(page, 'right', input);
    await next(page, input);
  }
  const s = await runnerState(page);
  expect(s.phase).toBe('summary');
  await expect(page.locator('.summary__title')).toBeVisible();
  return s.summary!;
}

/** Closes any trophy / Oasis celebration dialogs that are open. */
export async function dismissCelebrations(page: Page): Promise<number> {
  let n = 0;
  for (let i = 0; i < 10; i++) {
    const btn = page.locator('dialog[open] .dialog__actions .btn').last();
    if (!(await btn.isVisible())) break;
    // A dialog may close on its own between the check and the click (route change) — that's fine.
    if (await btn.click({ timeout: 2_000 }).then(() => true, () => false)) n++;
    await page.waitForTimeout(100);
  }
  return n;
}

/* ---------------- Lessons ---------------- */

/** Completes a Lesson answering each guided try correctly; optionally keyboard-only. */
export async function completeLesson(
  page: Page,
  skillId: string,
  input: 'mouse' | 'keyboard' = 'mouse',
  onStep?: (kind: string, index: number) => Promise<void>,
): Promise<void> {
  const lesson = lessons.find((l) => l.skillId === skillId)!;
  for (let i = 0; i < lesson.steps.length - 1; i++) {
    const step = lesson.steps[i]!;
    await onStep?.(step.kind, i);
    const main = page.locator('main');
    if (step.kind === 'model' && input === 'keyboard') await operateManipulativeWithKeyboard(page);
    if (step.kind === 'guided' && step.item) {
      const { operands, blank, choices } = step.item;
      const ans = blank === 'a' ? operands[0] : blank === 'b' ? operands[1] : operands[2];
      const idx = choices.indexOf(ans);
      const tile = main.locator('[role="radiogroup"] [role="radio"]').nth(idx);
      if (input === 'keyboard') {
        await tabTo(page, main.locator('[role="radiogroup"] [role="radio"]').first());
        for (let k = 0; k < idx; k++) await page.keyboard.press('ArrowDown');
        await expect(tile).toBeFocused();
        await page.keyboard.press('Enter');
      } else await tile.click();
      await expect(tile).toHaveAttribute('aria-checked', 'true');
    }
    const nextBtn = page.locator('.lesson-nav .btn').last();
    await expect(nextBtn).toBeEnabled();
    if (input === 'keyboard') {
      await tabTo(page, nextBtn);
      await page.keyboard.press('Enter');
    } else await nextBtn.click();
  }
  await expect(page.locator('.lesson-ready')).toBeVisible();
}

/**
 * Operates the step's manipulative with the keyboard only: tabs to each interactive control inside
 * `.manip` and activates it until the live summary stops changing (counters, ten-frame, number line…).
 */
export async function operateManipulativeWithKeyboard(page: Page): Promise<void> {
  const manip = page.locator('main .manip').first();
  await expect(manip).toBeVisible();
  const summary = manip.locator('.manip__summary');
  const before = (await summary.count()) ? await summary.innerText() : '';
  const slider = manip.locator('[role="slider"]');
  if (await slider.count()) {
    await tabTo(page, slider);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
  }
  for (let i = 0; i < 12; i++) {
    const control = manip.locator('button:not([disabled])').first();
    if (!(await control.count())) break;
    await tabTo(page, control);
    await page.keyboard.press('Enter');
  }
  if (before && (await summary.count())) await expect(summary).not.toHaveText(before);
}

/* ---------------- Navigation ---------------- */

/** Navigates inside the SPA (keeps the active profile and the Grown-up unlock, unlike page.goto). */
export async function spa(page: Page, path: string): Promise<void> {
  await dismissCelebrations(page); // celebrations held during an activity appear once it is left
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[?]/g, '\\?')}$`));
}
