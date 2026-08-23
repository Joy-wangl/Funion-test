/* 验证：评价表单默认收起 + 收藏灰底 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForTimeout(400);

  await page.click('.ap-cell:has-text("金蝶ERP") >> nth=0');
  await page.waitForSelector('.ap-detail');
  await page.waitForTimeout(300);

  // 头部：收藏灰底
  await page.screenshot({ path: `${OUT}/ac-rev-head.png`, clip: { x: 260, y: 0, width: 1340, height: 320 } });

  // 评价表单默认收起
  await page.locator('.ap-rev-form-closed').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-rev-closed.png` });

  // 点击展开
  await page.click('.ap-rev-form-closed');
  await page.waitForSelector('.ap-rev-form');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-rev-open.png` });

  // 收起
  await page.click('.ap-rev-collapse');
  await page.waitForSelector('.ap-rev-form-closed');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-rev-reclosed.png` });

  await browser.close();
  console.log('ac rev shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
