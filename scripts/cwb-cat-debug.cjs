const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.cwb-tabs button')].find((b) => b.textContent.trim() === '标记会话')?.click(); });
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => {
    const grid = document.querySelector('.cwb-cat-tags');
    const cs = getComputedStyle(grid);
    const items = [...grid.children].map((it) => ({
      w: Math.round(it.getBoundingClientRect().width),
      btnW: Math.round(it.querySelector('.cwb-cat-tag').getBoundingClientRect().width),
      display: getComputedStyle(it).display,
    }));
    return { cols: cs.gridTemplateColumns, display: cs.display, items: items.slice(0, 6), gridW: Math.round(grid.getBoundingClientRect().width) };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
