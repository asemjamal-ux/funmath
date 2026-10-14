// LHCI puppeteerScript: before the first audited URL, create a learner profile through the real UI
// (welcome → Grown-up Gate → profile form). The active profile lives in sessionStorage, which is per tab,
// so every tab Lighthouse opens gets it injected before the app boots.
const fs = require('node:fs');
const path = require('node:path');

const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/locales/en/common.json'), 'utf8'));
let profileId = null;

/** @param {import('puppeteer-core').Browser} browser @param {{url: string}} context */
module.exports = async (browser, { url }) => {
  if (profileId) return;
  const origin = new URL(url).origin;
  const page = await browser.newPage();
  await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });
  await page.click('.welcome__lang[lang="en"]');
  await page.waitForSelector('.gate__hold');
  await page.focus('.gate__hold');
  await page.keyboard.down('Space');
  await page.waitForSelector('.gate__words', { timeout: 5000 });
  await page.keyboard.up('Space');
  const words = (await page.$eval('.gate__words', (el) => el.textContent ?? '')).split(',').map((w) => w.trim());
  for (const w of words) {
    const d = [...Array(10).keys()].find((n) => en[`gate.digit.${n}`] === w);
    const keys = await page.$$('.gate .numpad__key');
    await keys[d === 0 ? 10 : d - 1].click();
  }
  await page.waitForSelector('#nickname');
  await page.type('#nickname', 'Sami');
  const buttons = await page.$$('main .btn');
  await buttons[buttons.length - 1].click();
  await page.waitForSelector('.world-picker');
  profileId = await page.evaluate(() => sessionStorage.getItem('oasis.activeProfile'));
  if (!profileId) throw new Error('lhci-setup: profile was not created');
  await page.close();

  const inject = async (target) => {
    if (target.type() !== 'page') return;
    const p = await target.page();
    await p?.evaluateOnNewDocument((id) => sessionStorage.setItem('oasis.activeProfile', id), profileId);
  };
  browser.on('targetcreated', (t) => void inject(t).catch(() => undefined));
};
