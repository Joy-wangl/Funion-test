/* 验证：类目管理抽屉图标选择交互 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(400);
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.click('button:has-text("上传新创作")');
  await page.waitForTimeout(400);
  await page.click('button:has-text("类目管理")');
  await page.waitForSelector('.ap-drawer .ap-cat-row');
  await page.screenshot({ path: `${OUT}/ac-catpick.png` });

  // 打开第一行图标弹层
  await page.click('.ap-cat-row >> nth=0 >> .ap-cat-icon');
  await page.waitForSelector('.ap-cat-pick');
  const tiles = await page.evaluate(() => document.querySelectorAll('.ap-cat-pick button').length);
  const up = await page.evaluate(() => document.querySelectorAll('.ap-cat-pick-up').length);
  await page.screenshot({ path: `${OUT}/ac-catpick-open.png` });

  // 选 star 图标，确认 chip 变化
  await page.click('.ap-cat-pick button >> nth=8');
  await page.waitForTimeout(200);
  const picked = await page.evaluate(() => document.querySelectorAll('.ap-cat-pick').length);
  await page.screenshot({ path: `${OUT}/ac-catpick-picked.png` });
  console.log(`tiles=${tiles} upload=${up} pickerClosedAfterPick=${picked === 0}`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
