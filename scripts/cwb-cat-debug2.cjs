const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.cwb-tabs button')].find((b) => b.textContent.trim() === '标记会话')?.click(); });
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => {
    const btn = document.querySelector('.cwb-cat-item .cwb-cat-tag');
    const cs = getComputedStyle(btn);
    return { display: cs.display, width: cs.width, boxSizing: cs.boxSizing, parentDisplay: getComputedStyle(btn.parentElement).display, cls: btn.className };
  });
  console.log(JSON.stringify(info));
  await browser.close();
})();
