const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-tabs button')].find(x => x.textContent.includes('标记会话'));
    b && b.click();
  });
  await page.waitForTimeout(400);
  const readChips = () => page.evaluate(() => {
    const grp = document.querySelector('.cwb-code-group');
    if (!grp) return null;
    const r = grp.getBoundingClientRect();
    return {
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      all: (() => { const a = grp.querySelector('.cwb-code-all'); return a ? { on: a.classList.contains('on') } : null; })(),
      codes: [...grp.querySelectorAll('.cwb-code-tag:not(.cwb-code-all)')].map(c => ({ t: c.textContent.trim().slice(0, 6), on: c.classList.contains('on') })),
    };
  });
  console.log('INIT', JSON.stringify(await readChips()));
  await page.screenshot({ path: `${OUT}/cwb-code-multi-init.png` });
  // deselect one code
  await page.evaluate(() => {
    const grp = document.querySelector('.cwb-code-group');
    const codes = grp.querySelectorAll('.cwb-code-tag:not(.cwb-code-all)');
    codes[1].click();
  });
  await page.waitForTimeout(300);
  console.log('AFTER-DESELECT-1', JSON.stringify(await readChips()));
  // click 全部 → all on
  await page.evaluate(() => { document.querySelector('.cwb-code-all').click(); });
  await page.waitForTimeout(300);
  console.log('AFTER-ALL', JSON.stringify(await readChips()));
  await page.screenshot({ path: `${OUT}/cwb-code-multi-all.png` });
  // tag flow: pick a sub then confirm, read tag target
  await page.evaluate(() => {
    const c = [...document.querySelectorAll('.cwb-cat-tag')][0];
    c && c.click();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const s = [...document.querySelectorAll('.cwb-sub')][0];
    s && s.click();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-confirm')][0];
    b && b.click();
  });
  await page.waitForTimeout(300);
  const tag = await page.evaluate(() => [...document.querySelectorAll('.cwb-tagged .cwb-tag-target')].map(t => t.textContent.trim()));
  console.log('TAG-TARGET', JSON.stringify(tag));
  console.log('CONSOLE-ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
  await browser.close();
})();
