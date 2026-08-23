/* 验证：c-1 评价溢出横滑 + 卡片紧凑 + 上传框放大 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  // c-1：我的创作第一个
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.click('.ap-mine-tabs button:has-text("我的创作")');
  await page.waitForTimeout(300);
  await page.click('.ap-grid.mine .ap-cell >> nth=0');
  await page.waitForSelector('.ap-detail');
  await page.waitForTimeout(300);
  await page.locator('.ap-rev-cards').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-revmore-1.png` });
  await page.click('.ap-rev-nav button >> nth=1');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/ac-revmore-2.png` });

  // 金蝶ERP：表单上传框放大
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForTimeout(400);
  await page.click('.ap-cell:has-text("金蝶ERP") >> nth=0');
  await page.waitForSelector('.ap-detail');
  await page.waitForTimeout(300);
  await page.click('.ap-rev-form-closed');
  await page.waitForSelector('.ap-rev-form');
  await page.setInputFiles('.ap-rev-up-add input', ['public/products/main.png', 'public/products/serum.png']);
  await page.waitForTimeout(500);
  await page.locator('.ap-rev-up').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-revmore-3.png` });

  await browser.close();
  console.log('ac revmore shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
