/* 临时截图：运营管理/内部商机 表格操作列（详情+添加到） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  await page.click('.ops-center .nav-text:has-text("运营管理")');
  await page.waitForSelector('.om-page .ib-table');
  await page.locator('.om-page .actions-col').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ops-verify-acts-col.png` });
  console.log('shot ok');
  await browser.close();
})();
