const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1800, height: 950 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGEERROR', err.message));
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.click('.top-tabs-item:has-text("AI作图中心")');
  await page.waitForSelector('.as-wb', { timeout: 30000 });
  await page.waitForTimeout(1000);

  // click first action via JS and log errors
  try {
    await page.locator('.as-act').first().evaluate((el) => {
      try { el.click(); } catch (e) { console.error('click err', e); }
    });
  } catch (e) { console.log('eval click err', e.message); }
  await page.waitForTimeout(1000);

  // also try programmatic Vue exposed method if any
  const actionText = await page.locator('.as-act').first().innerText();
  console.log('first action text:', actionText.split('\n')[0]);
  await page.screenshot({ path: `${OUT}/as-debug6.png` });
  await browser.close();
})();
