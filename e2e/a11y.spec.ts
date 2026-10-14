import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { answer, completeLesson, currentItem, dismissCelebrations, next, passGate, runnerState, spa } from './helpers';

/*
 * Accessibility layer (agent-instructions §12.1, §12.3; DS §5.2), against the production bundle:
 *  - axe-core (WCAG 2.2 A/AA rules): zero serious or critical violations on every route and key state;
 *  - Arabic screens with Number Style "arab": no Western digit 0–9 inside `main` (text, aria-label,
 *    aria-valuetext, title), except nodes marked lang="en";
 *  - target size: every visible interactive element ≥ 48 × 48 px; answer choices and Number Pad keys
 *    ≥ 64 × 64 px (≥ 80 × 80 px for Stage 1 answer choices).
 */

type Locale = 'en' | 'ar';

interface Finding {
  state: string;
  kind: 'axe' | 'digits' | 'target' | 'i18n';
  detail: string;
}

async function axeFindings(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.impact} ${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}

async function westernDigits(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const roots = [...document.querySelectorAll('main'), ...document.querySelectorAll('dialog[open]')];
    // lang="en" nodes and the Number Style sample ("0123", decision 001 #8) are exempt.
    const exempt = (el: Element | null) => Boolean(el?.closest('[lang="en"], [lang^="en-"], [data-digit-sample]'));
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (/[0-9]/.test(n.textContent ?? '') && !exempt(el) && !el?.closest('script, style')) out.push(`text "${n.textContent!.trim().slice(0, 60)}" in <${el?.tagName.toLowerCase()} class="${el?.className}">`);
      }
      for (const el of root.querySelectorAll('[aria-label], [aria-valuetext], [title]')) {
        if (exempt(el)) continue;
        for (const attr of ['aria-label', 'aria-valuetext', 'title']) {
          const v = el.getAttribute(attr);
          if (v && /[0-9]/.test(v)) out.push(`${attr}="${v.slice(0, 60)}" on <${el.tagName.toLowerCase()} class="${el.className}">`);
        }
      }
    }
    return out;
  });
}

async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const sel = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="radio"], [role="slider"], [role="gridcell"][tabindex], [tabindex="0"]';
    const seen = new Set<Element>();
    for (const raw of document.querySelectorAll(sel)) {
      // A native control inside a <label> is hit through its label (radio rows, the file button).
      const el = raw.matches('input, select, textarea') ? (raw.closest('label') ?? raw) : raw;
      if (seen.has(el)) continue;
      seen.add(el);
      if (el.closest('[inert], [aria-hidden="true"]') || (raw as HTMLElement).closest('.visually-hidden') === raw) {
        if (el === raw) continue;
      }
      const dialog = el.closest('dialog');
      if (dialog && !dialog.open) continue;
      if (document.querySelector('dialog[open]') && !dialog) continue; // page behind a modal is inert
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || style.visibility === 'hidden' || style.display === 'none') continue;
      // WCAG 2.5.8 inline exception: links inside a sentence.
      if (el.tagName === 'A' && el.closest('p, li') && style.display === 'inline') continue;
      let min = 48;
      if (el.matches('.choice, .numpad__key')) min = el.closest('.choices--large') ? 80 : 64;
      if (el.matches('.numpad__key') && el.closest('.numpad--large')) min = 64;
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w < min || h < min) {
        const name = (el.getAttribute('aria-label') ?? (el.textContent ?? '')).trim().slice(0, 30);
        out.push(`${w}×${h} < ${min} <${el.tagName.toLowerCase()} class="${el.className}"> "${name}"`);
      }
    }
    return out;
  });
}

function auditor(page: Page, locale: Locale) {
  const findings: Finding[] = [];
  const audit = async (state: string) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(150); // let focus/route effects settle
    const label = `${locale} · ${state}`;
    for (const d of await axeFindings(page)) findings.push({ state: label, kind: 'axe', detail: d });
    if (locale === 'ar') for (const d of await westernDigits(page)) findings.push({ state: label, kind: 'digits', detail: d });
    for (const d of await smallTargets(page)) findings.push({ state: label, kind: 'target', detail: d });
    // An ICU message shown unformatted (e.g. "Answer key: {title}") means a catalogue or its arguments are broken.
    const raw = await page.locator('main').evaluate((m) => (m.textContent ?? '').match(/\{[A-Za-z_]\w*\}/g) ?? []);
    for (const d of raw) findings.push({ state: label, kind: 'i18n', detail: `unformatted placeholder ${d}` });
  };
  return { audit, findings };
}

for (const locale of ['en', 'ar'] as const) {
  test(`a11y · every route and key state (${locale})`, async ({ page }) => {
    test.setTimeout(300_000);
    const { audit, findings } = auditor(page, locale);
    const L = (p: string) => `/${locale}${p}`;

    // First run.
    await page.goto(L('/'));
    await expect(page.locator('.welcome__lang')).toHaveCount(2);
    await audit('welcome');
    await page.goto(L('/worksheets')); // printable worksheets work without a profile
    await expect(page.locator('.ws-title')).toBeVisible();
    await audit('worksheets (no profile)');
    await page.goto(L('/'));
    await page.locator(`.welcome__lang[lang="${locale}"]`).click();
    await expect(page.locator('.gate__hold')).toBeVisible();
    await audit('gate · hold');
    await passGate(page, locale, () => audit('gate · digits'));
    await expect(page.locator('#nickname')).toBeVisible();
    await audit('setup');
    await page.locator('#nickname').fill(locale === 'ar' ? 'سامي' : 'Sami');
    await page.locator('input[name="stage"]').nth(2).check(); // Stage 3: column entry and all Worlds reachable
    await page.locator('main .btn').last().click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/home$`));
    await audit('home');

    // Worlds, Skill path, Skill page.
    await page.locator('.world-chip:not(.world-chip--mix)').nth(1).locator('.world-chip__link').click();
    await audit('world');
    await spa(page, L('/skill/ADD-01'));
    await audit('skill');

    // Lesson, every step kind, then the trophy celebration.
    await spa(page, L('/lesson/ADD-01'));
    await completeLesson(page, 'ADD-01', 'mouse', (kind, i) => audit(`lesson step ${i + 1} (${kind})`));
    await expect(page.locator('dialog[open]')).toBeVisible();
    await audit('lesson ready + trophy dialog');
    await dismissCelebrations(page);

    // Practice: choice (Stage 1), first wrong → hint, Hint level 2, Worked Example, summary.
    await spa(page, L('/practice/ADD-01'));
    await runnerState(page);
    await audit('practice · choice');
    await answer(page, 'wrong');
    await audit('practice · try again + hint');
    await page.locator('.topbar .icon-btn').nth(1).click();
    await audit('practice · hint level 2');
    await answer(page, 'wrong');
    await audit('practice · worked example');
    await next(page);
    await answer(page, 'right');
    await audit('practice · correct');
    await page.locator('.topbar .icon-btn').first().click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await audit('practice · leave dialog');
    await page.locator('dialog[open] .dialog__actions .btn').last().click();
    await page.waitForTimeout(300);
    if (await page.locator('dialog[open]').count()) await audit('celebration after leaving');

    // Number entry and column entry (ADD-07: Tier 2 is column entry after three first-try items).
    await spa(page, L('/practice/ADD-07'));
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const s = await runnerState(page);
      if (s.phase === 'summary') break;
      const item = await currentItem(page);
      if (!seen.has(item.format)) {
        seen.add(item.format);
        await audit(`practice · ${item.format} (Stage 3)`);
      }
      await answer(page, 'right');
      await next(page);
    }
    expect(seen.has('column')).toBe(true);
    await spa(page, L('/practice/ADD-02'));
    for (let i = 0; i < 10 && (await currentItem(page)).format !== 'entry'; i++) {
      await answer(page, 'right');
      await next(page);
    }
    await audit('practice · number entry (Stage 1)');
    for (let i = 0; i < 12 && (await runnerState(page)).phase !== 'summary'; i++) {
      if ((await runnerState(page)).phase === 'answering') await answer(page, 'right');
      await next(page);
    }
    await expect(page.locator('.summary__title')).toBeVisible();
    await audit('practice · summary');
    await dismissCelebrations(page);

    // Daily Mix, Games, Trophy Room, My Progress, About, 404.
    await spa(page, L('/daily-mix'));
    await runnerState(page);
    await audit('daily mix');
    await spa(page, L('/games'));
    await audit('games hub');
    for (const g of ['bubble-pop', 'number-line-hop', 'match-pairs']) {
      await spa(page, L(`/games/${g}?skill=ADD-01`));
      await expect(page.locator('.game__title')).toBeVisible();
      await audit(`game · ${g}`);
    }
    await spa(page, L('/trophies'));
    await audit('trophy room');
    await spa(page, L('/progress'));
    await audit('my progress');
    await spa(page, L('/about'));
    await audit('about');
    await spa(page, L('/no-such-page'));
    await audit('not found');
    await spa(page, L('/worksheets'));
    await expect(page.locator('.ws-title')).toBeVisible();
    await audit('worksheets');

    // Grown-ups Area.
    await spa(page, L('/grown-ups'));
    await expect(page.locator('.gate__hold')).toBeVisible();
    await passGate(page, locale);
    await expect(page.locator('.grownups__nav')).toBeVisible();
    await audit('grown-ups home');
    await page.locator('main a[href*="/grown-ups/report/"]').first().click();
    await audit('grown-ups report');
    const nav = page.locator('.grownups__navlink');
    const pages = ['profiles', 'settings', 'data', 'privacy'];
    for (const [i, name] of pages.entries()) {
      await nav.nth(i + 1).click();
      await audit(`grown-ups ${name}`);
    }
    await nav.nth(1).click();
    await page.locator('main .btn--danger').first().click();
    await audit('grown-ups delete-profile dialog');
    await page.locator('dialog[open] .dialog__actions .btn').first().click();

    // Profile picker (switch profile).
    await page.locator('.topbar .btn').first().click();
    await page.locator('.me-btn').click();
    await expect(page.locator('.picker__list')).toBeVisible();
    await audit('profile picker');

    const report = findings.map((f) => `[${f.kind}] ${f.state}: ${f.detail}`);
    expect(report, 'accessibility findings').toEqual([]);
  });
}
