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
  const pickTab = () => page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-tabs button')].find(x => x.textContent.includes('优化提示'));
    b && b.click();
  });
  const pickSession = (code) => page.evaluate((c) => {
    const cards = [...document.querySelectorAll('.csw-sess-card')];
    const card = cards.find(x => x.textContent.includes(c));
    card && card.click();
  }, code);
  const readOpt = () => page.evaluate(() => {
    const body = [...document.querySelectorAll('.cwb-body')].find(b => b.querySelector('.cwb-opt-metrics') || b.querySelector('.cwb-opt-goods'));
    if (!body) return null;
    const r = body.getBoundingClientRect();
    return {
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      titles: [...body.querySelectorAll('.cwb-sec-t')].map(e => e.textContent.trim().replace(/\s+/g, ' ')),
      hasMetrics: !!body.querySelector('.cwb-opt-metrics'),
      hasLoose: !!body.querySelector('.cwb-opt-loose'),
      hasGoods: !!body.querySelector('.cwb-opt-goods'),
      mines: [...body.querySelectorAll('.cwb-opt-mine')].map(m => m.textContent.trim()),
    };
  });
  await pickTab();
  await page.waitForTimeout(300);
  console.log('S1-SHOP', JSON.stringify(await readOpt()));
  await page.screenshot({ path: `${OUT}/cwb-opt-kind-s1.png` });
  await pickSession('4387');
  await page.waitForTimeout(400);
  console.log('S3-EXP', JSON.stringify(await readOpt()));
  await page.screenshot({ path: `${OUT}/cwb-opt-kind-s3.png` });
  await pickSession('5996');
  await page.waitForTimeout(400);
  console.log('BACK-S1', JSON.stringify(await readOpt()));
  console.log('CONSOLE-ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
  await browser.close();
})();
