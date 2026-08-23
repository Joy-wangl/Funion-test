/* 验证：统计条短分割线 + 收藏移至头部右上 */
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

  await page.click('.ap-cell:has-text("杭州巡店助手") >> nth=0');
  await page.waitForSelector('.ap-detail');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-fav-head.png`, clip: { x: 260, y: 0, width: 1340, height: 320 } });

  // 点收藏验证切换
  await page.click('.ap-detail-fav');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-fav-on.png`, clip: { x: 260, y: 0, width: 1340, height: 320 } });

  await browser.close();
  console.log('ac fav shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
