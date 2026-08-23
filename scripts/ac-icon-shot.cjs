/* 验证：侧栏类目专属图标 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/ac-icon-side.png`, clip: { x: 0, y: 60, width: 300, height: 500 } });
  await browser.close();
  console.log('ac icon shot ok');
})().catch((e) => { console.error(e); process.exit(1); });
