/* 临时验证：详情页删除「最新版更新内容」，更新描述归入「新功能介绍」 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.click('.ap-side button:has-text("全部")');
  await page.waitForSelector('.ap-grid');

  const results = {};
  await page.click('.ap-grid .ap-row-name:has-text("金蝶ERP")');
  await page.waitForSelector('.ap-detail');
  results['detail.noWhatsnew'] = (await page.locator('.ap-detail :text("最新版更新内容")').count()) === 0;
  results['detail.featSection'] = (await page.locator('.ap-detail .ap-detail-sub:has-text("新功能介绍")').count()) === 1;
  results['detail.featHasNote'] = (await page.locator('.ap-detail .ap-feat-entry li:has-text("升级报表引擎")').count()) >= 1;

  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-acdetail.png` });

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'ACDETAIL VERIFY OK' : `ACDETAIL VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
