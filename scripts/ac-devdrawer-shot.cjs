/* 验证：开发者信息行点击抽屉展示上架应用 */
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

  await scrollTo(page, '开发者信息');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-devrow.png` });

  // 点击开发者行打开抽屉
  await page.click('button.ap-dev');
  await page.waitForSelector('.ap-drawer');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-devdrawer.png` });

  // 抽屉内点击其他应用跳转
  await page.click('.ap-drawer .ap-dev-app:has-text("聚水潭ERP")');
  await page.waitForTimeout(400);
  const title = await page.textContent('.ap-detail-info h2');
  console.log('jumped to:', title.trim());
  await page.screenshot({ path: `${OUT}/ac-devjump.png` });

  await browser.close();
  console.log('ac devdrawer shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
