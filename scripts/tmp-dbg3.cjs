const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  page.on('console', (m) => { const t = m.text(); if (t.includes('[品控-mock]')) console.log('CONSOLE:', t.slice(0, 100)); });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => { [...document.querySelectorAll('.top-tabs-item')].find((e) => e.textContent.includes('品控-线上'))?.click(); });
  await page.waitForTimeout(500);
  for (const label of ['店铺商品', '店铺列表']) {
    const clicked = await page.evaluate((label) => {
      const els = [...document.querySelectorAll('.qc-side *')].filter((e) => e.children.length === 0 && e.textContent.trim() === label);
      if (!els.length) return 'miss';
      els[0].click();
      return 'ok:' + els.length;
    }, label);
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => ({
      title: document.querySelector('.qc-title')?.textContent.trim().slice(0, 20),
      sg: document.querySelectorAll('.qc-sg-table tbody tr').length,
      sl: document.querySelectorAll('.qc-sl-table tbody tr').length,
    }));
    console.log(label, clicked, JSON.stringify(info));
  }
  await browser.close();
})();
