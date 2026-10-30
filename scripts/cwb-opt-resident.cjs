const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const read = () => page.evaluate(() => {
    const mod = document.querySelector('.cwb-mod[data-mod="opt"]');
    return {
      titles: [...mod.querySelectorAll('.cwb-sec-t')].map((t) => t.textContent.trim().replace(/\s+/g, ' ')),
      metricCount: mod.querySelectorAll('.cwb-opt-metric').length,
      badge: [...mod.querySelectorAll('.cwb-opt-badge')].map((b) => b.textContent.trim()),
      hasLoose: !!mod.querySelector('.cwb-opt-loose'),
      score: mod.querySelector('.cwb-opt-goods-score')?.textContent.trim() ?? null,
      grade: mod.querySelector('.cwb-opt-goods-grade')?.textContent.trim() ?? null,
      hasTip: !!mod.querySelector('.cwb-opt-goods-tip'),
      mines: [...mod.querySelectorAll('.cwb-opt-mine')].map((m) => m.textContent.trim()),
      secHeights: [...mod.querySelectorAll('.cwb-sec')].map((s) => Math.round(s.getBoundingClientRect().height)),
    };
  });
  const s1 = await read();
  await page.screenshot({ path: 'D:/PM.funion/screenshots/cwb-opt-resident-s1.png' });
  await page.evaluate(() => document.querySelectorAll('.csw-sess-card')[2]?.click());
  await page.waitForTimeout(500);
  const s3 = await read();
  await page.screenshot({ path: 'D:/PM.funion/screenshots/cwb-opt-resident-s3.png' });
  await page.evaluate(() => document.querySelectorAll('.csw-sess-card')[0]?.click());
  await page.waitForTimeout(400);
  const back = await read();
  console.log(JSON.stringify({ s1, s3, back, errors }, null, 2));
  await browser.close();
})();
