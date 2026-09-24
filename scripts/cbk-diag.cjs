const { chromium } = require('D:/PM.funion/.playwright/package');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.locator('.top-tabs-item', { hasText: '智能运营中心' }).first().click();
  await page.waitForTimeout(1200);
  const navs = await page.locator('.side .nav-parent .nav-text').allTextContents();
  console.log('NAV_TEXTS', JSON.stringify(navs));
  const subs = await page.locator('.side .subnav').allTextContents();
  console.log('SUBNAVS', JSON.stringify(subs));
  await browser.close();
})();
