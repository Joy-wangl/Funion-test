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

  // 收藏与按钮一致：默认隐藏，悬浮卡片才展示
  const favHidden = await page.evaluate(() => getComputedStyle(document.querySelector('.ap-fav')).opacity === '0');
  await page.hover('.ap-cell >> nth=1');
  await page.waitForTimeout(250);
  const favShownOnHover = await page.evaluate(() => getComputedStyle(document.querySelectorAll('.ap-fav')[1]).opacity === '1');
  await page.screenshot({ path: `${OUT}/ac-fav-hover.png`, clip: { x: 260, y: 60, width: 1340, height: 420 } });

  await page.click('.ap-cell:has-text("杭州巡店助手") >> nth=0');
  await page.waitForSelector('.ap-detail');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-fav-head.png`, clip: { x: 260, y: 0, width: 1340, height: 320 } });

  // 点收藏验证切换
  await page.click('.ap-detail-fav');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-fav-on.png`, clip: { x: 260, y: 0, width: 1340, height: 320 } });

  await browser.close();
  console.log(`favHidden=${favHidden} favShownOnHover=${favShownOnHover}`);
})().catch((e) => { console.error(e); process.exit(1); });
