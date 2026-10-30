const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));

  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // tab order in the board head
  const tabs = await page.$$eval('.cwb-tabs button', (els) => els.map((e) => ({ t: e.textContent.trim(), on: e.className.includes('on') })));
  console.log('TABS', JSON.stringify(tabs));

  // click 优化提示 tab
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-tabs button')].find((x) => x.textContent.trim() === '优化提示');
    b && b.click();
  });
  await page.waitForTimeout(400);

  const badge = await page.$eval('.cwb-opt-badge', (e) => e.textContent.trim()).catch(() => 'NONE');
  const metrics = await page.$$eval('.cwb-opt-metric', (els) => els.map((e) => e.querySelector('.k').textContent.trim() + '=' + e.querySelector('.v').textContent.trim()));
  const loose = await page.$eval('.cwb-opt-loose', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => 'NONE');
  const score = await page.$eval('.cwb-opt-goods-score', (e) => e.textContent.trim()).catch(() => 'NONE');
  const grade = await page.$eval('.cwb-opt-goods-grade', (e) => e.textContent.trim()).catch(() => 'NONE');
  const mines = await page.$$eval('.cwb-opt-mine', (els) => els.map((e) => e.textContent.trim()));
  console.log('BADGE', badge);
  console.log('METRICS', JSON.stringify(metrics));
  console.log('LOOSE', loose);
  console.log('GOODS', score, grade);
  console.log('MINES', JSON.stringify(mines));
  // kb-foot must NOT render on opt tab
  const foot = await page.$('.cwb-kb-foot');
  console.log('KB_FOOT_ON_OPT', foot ? 'PRESENT(bad)' : 'absent(ok)');

  await page.screenshot({ path: OUT + '/cwb-opt-tab.png' });

  // collapsed rail: fold then count rail items and click third
  await page.evaluate(() => { const f = document.querySelector('.cwb-fold'); f && f.click(); });
  await page.waitForTimeout(300);
  const rail = await page.$$eval('.cwb-rail-item', (els) => els.map((e) => e.getAttribute('title')));
  console.log('RAIL', JSON.stringify(rail));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-rail-item')].find((x) => x.getAttribute('title') === '优化提示');
    b && b.click();
  });
  await page.waitForTimeout(300);
  const railOpens = await page.$$eval('.cwb-tabs button', (els) => els.map((e) => ({ t: e.textContent.trim(), on: e.className.includes('on') })));
  console.log('RAIL_OPEN_TABS', JSON.stringify(railOpens));
  await page.screenshot({ path: OUT + '/cwb-opt-rail.png' });

  console.log('CONSOLE_ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
  await browser.close();
})();
