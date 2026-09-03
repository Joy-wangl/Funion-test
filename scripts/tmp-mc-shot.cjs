/* 临时截图：素材库展开态 + 悬浮操作气泡 */
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
  await page.click('.subnav:has-text("竞价商品")');
  await page.waitForSelector('.ops-center .page.show .bd-table');
  await page.locator('.ops-center .page.show .bd-table tbody a:has-text("详情")').first().click();
  await page.waitForSelector('.sgd-top-title');
  await page.click('.cpd-top-acts button:has-text("编辑")');
  await page.click('.cpd-side-btn:has-text("素材")');
  await page.waitForSelector('.mc-page');

  /* 展开第三条素材库条目 */
  await page.locator('.mc-lib .mc-fold:has-text("展开")').nth(2).click();
  await page.waitForTimeout(300);

  /* 悬浮左卡详情图，触发操作气泡 */
  await page.locator('.mc-left .mc-imgs.two .mc-img').first().hover();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ops-verify-material-round6.png` });

  /* 展开态 SKU 行特写 */
  await page.locator('.mc-lib-open .mc-rgrid.sku').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ops-verify-material-round6b.png` });
  console.log('shot ok');
  await browser.close();
})();
