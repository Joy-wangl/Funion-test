/* 临时：销售中态筛选区截图（验证无下架原因条件） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion/screenshots';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  await page.click('.nav-text:has-text("店铺商品")');
  await page.waitForSelector('.sg-page:visible .sg-filter');
  await page.click('.sg-page:visible .sg-chip:has-text("销售中")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ops-verify-selling-conds.png` });
  await browser.close();
  console.log('OK');
})();
