/* 验证：评价横滑条超出展示区域的左右箭头交互 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  // 我的 → 我的创作 → 第二个应用（c-2）
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.click('.ap-mine-tabs button:has-text("我的创作")');
  await page.waitForTimeout(300);
  await page.click('.ap-grid.mine .ap-cell >> nth=1');
  await page.waitForSelector('.ap-detail');
  await page.waitForTimeout(300);

  await page.locator('.ap-rev-cards').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-revnav-1.png` });

  // 右滑一屏
  await page.click('.ap-rev-nav button >> nth=1');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/ac-revnav-2.png` });

  // 滑到末尾
  await page.click('.ap-rev-nav button >> nth=1');
  await page.waitForTimeout(700);
  await page.click('.ap-rev-nav button >> nth=1');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/ac-revnav-3.png` });

  await browser.close();
  console.log('ac revnav shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
