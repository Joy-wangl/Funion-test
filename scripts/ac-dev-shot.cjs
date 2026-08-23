/* 验证：统计条(评分/排行/开发者) + 新功能单条 + 版本历史 + 开发者信息模块 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

const scrollTo = (page, text) => page.evaluate((t) => {
  const main = document.querySelector('.ap-main');
  const el = [...document.querySelectorAll('.ap-detail-sub')].find((x) => x.textContent.includes(t));
  if (main && el) {
    const r = el.getBoundingClientRect();
    const m = main.getBoundingClientRect();
    main.scrollTop += r.top - m.top - 8;
  }
}, text);

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
  await page.screenshot({ path: `${OUT}/ac-dev-strip.png` });

  await scrollTo(page, '新功能介绍');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-dev-feat.png` });

  await page.click('.ap-sec-head .ap-link:has-text("版本历史记录")');
  await page.waitForSelector('.ap-modal-lg');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-dev-hist.png` });
  await page.click('.ap-modal-lg .ap-modal-head button');
  await page.waitForTimeout(200);

  await scrollTo(page, '开发者信息');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-dev-info.png` });

  await browser.close();
  console.log('ac dev shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
