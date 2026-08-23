/* 验证：数据看板入口+二级页、我的应用间距 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  // 入口：贡献榜头部「全部数据」
  const entry = await page.locator('.ap-rank-head .ap-link').textContent();
  await page.screenshot({ path: `${OUT}/ac-dash-entry.png`, clip: { x: 0, y: 300, width: 1100, height: 600 } });

  // 进入看板
  await page.click('.ap-rank-head .ap-link');
  await page.waitForSelector('.ap-dash');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-dash.png`, fullPage: true });

  // 范围切换
  await page.click('.ap-dash-range button:has-text("近7天")');
  await page.waitForTimeout(200);
  const on7 = await page.evaluate(() => document.querySelector('.ap-dash-range button.on')?.textContent);
  await page.screenshot({ path: `${OUT}/ac-dash-7d.png`, clip: { x: 200, y: 200, width: 1200, height: 500 } });

  // 返回首页
  await page.click('.ap-dash-head .ap-back');
  await page.waitForSelector('.ap-home-rank-row');

  // 我的应用间距
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-mine-gap.png`, clip: { x: 0, y: 60, width: 1600, height: 420 } });

  console.log(`entry=${entry} rangeOn=${on7}`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
