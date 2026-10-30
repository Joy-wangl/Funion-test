const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 950 } });
  page.setDefaultTimeout(60000);
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.click('.top-tabs-item:has-text("AI作图中心")');
  await page.waitForSelector('.as-wb', { timeout: 30000 });
  await page.waitForTimeout(1000);

  await page.locator('.as-act').filter({ hasText: '一键全素材' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/as-debug3.png` });

  const tiles = await page.locator('.as-src-tile').allInnerTexts();
  console.log('src tiles:', tiles);
  await page.locator('.as-src-tile').filter({ hasText: '选择店铺商品' }).first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/as-debug4.png` });
  const html = await page.content();
  fs.writeFileSync(`${OUT}/as-debug-html2.html`, html.slice(0, 500000));
  const modalTitles = await page.locator('.modal-head .m-title').allInnerTexts();
  console.log('modal titles:', modalTitles);
  await browser.close();
})();
