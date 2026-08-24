/* 临时验证：评论横滑条翻页箭头还原为贴条两侧垂直居中的素 chevron */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';
const BASE = process.argv[2] || 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-page .ap-cats');
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForSelector('.ap-grid .ap-cell');
  await page.click('.ap-grid .ap-cell');
  await page.waitForSelector('.ap-detail .ap-rev-cards');

  const results = {};
  results['nav.goneFromHeader'] = (await page.locator('.ap-sec-head .ap-rev-nav').count()) === 0;

  const arrowR = page.locator('.ap-rev-arrow.r');
  results['arrow.rightVisible'] = (await arrowR.count()) === 1;
  const aBox = await arrowR.boundingBox();
  const sBox = await page.locator('.ap-rev-cards').boundingBox();
  const aCy = aBox.y + aBox.height / 2;
  const sCy = sBox.y + sBox.height / 2;
  results['arrow.verticalCenter'] = !!aBox && Math.abs(aCy - sCy) < 40;
  results['arrow.noLeftAtStart'] = (await page.locator('.ap-rev-arrow.l').count()) === 0;

  await page.screenshot({ path: `${OUT}/vue-verify-revnav.png` });

  await arrowR.click();
  await page.waitForTimeout(600);
  results['arrow.scrollWorks'] = (await page.locator('.ap-rev-cards').evaluate((el) => el.scrollLeft)) > 0;
  results['arrow.leftAppears'] = (await page.locator('.ap-rev-arrow.l').count()) === 1;
  await page.screenshot({ path: `${OUT}/vue-verify-revnav-scrolled.png` });

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'REVNAV VERIFY OK' : `REVNAV VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
