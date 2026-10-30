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
  // click 标记会话 tab
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-tabs button')].find(x => x.textContent.includes('标记会话'));
    b && b.click();
  });
  await page.waitForTimeout(400);
  // read section title order
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('.cwb-body[style*=""] .cwb-sec-t, .cwb-sec-t')]
      .map(e => e.textContent.trim())
      .filter(Boolean)
  );
  const tagOrder = await page.evaluate(() => {
    const body = [...document.querySelectorAll('.cwb-body')].find(b => b.querySelector('.cwb-gran'));
    if (!body) return [];
    return [...body.querySelectorAll('.cwb-sec-t')].map(e => e.textContent.trim());
  });
  console.log('TAG-SEC-ORDER', JSON.stringify(tagOrder));
  await page.screenshot({ path: `${OUT}/cwb-tag-reorder.png`, fullPage: false });
  console.log('CONSOLE-ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
  await browser.close();
})();
