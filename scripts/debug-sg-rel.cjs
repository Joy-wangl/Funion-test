const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForTimeout(300);
  await page.click('.ops-center .nav:has(.nav-text:has-text("店铺商品"))');
  await page.waitForTimeout(500);
  /* 筛选命中预警 */
  await page.click('.sg-page .sg-field:has(label:has-text("是否命中预警")) .bselect-trigger');
  await page.waitForTimeout(200);
  await page.click('.bselect-menu .bselect-opt:has-text("命中预警")');
  await page.waitForTimeout(200);
  await page.locator('.sg-page .sg-actions .sg-btn.primary').last().evaluate((el) => el.click());
  await page.waitForTimeout(500);
  const relCount = await page.locator('.ops-center .sg-acts a:has-text("关联商品")').count();
  console.log('sg rel count:', relCount);
  await page.screenshot({ path: `${OUT}/debug-sg-rel.png` });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
