/* v11 探针：新建抽屉现状截图（用后即删） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.top-tabs-item');
  await page.locator('.top-tabs-item', { hasText: '品控中心2.0' }).click();
  await page.waitForSelector('.qc2-dash');
  await page.locator('.qc-nav', { hasText: '标签配置' }).click();
  await page.waitForSelector('.qc2-cfg-table');
  await page.locator('.qc2-cfg-toolbar button', { hasText: '新建标签' }).click();
  await page.waitForSelector('.qc2-drawer-edit');
  await page.waitForTimeout(400);
  await page.locator('.qc2-drawer-edit').screenshot({ path: 'd:/Qoder/Funion/screenshots/qc2-v11-before.png' });
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(2); });
