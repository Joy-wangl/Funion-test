/* 复现：用户提交评价(21/2132+图)后卡片布局，dump 卡片 HTML 定位空白带 */
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

  // 展开表单，照用户输入
  await page.click('.ap-rev-form-closed');
  await page.waitForSelector('.ap-rev-form');
  await page.click('.ap-rev-pick button >> nth=4');
  await page.fill('.ap-rev-form input', '21');
  await page.fill('.ap-rev-form textarea', '2132');
  await page.setInputFiles('.ap-rev-up-add input', ['public/products/main.png']);
  await page.waitForTimeout(500);
  await page.locator('.ap-rev-up').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/ac-revband-form.png` });

  await page.click('.ap-rev-foot .ap-btn-blue');
  await page.waitForTimeout(400);
  await page.locator('.ap-rev-cards').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-revband-card.png` });

  const html = await page.evaluate(() => {
    const card = document.querySelector('.ap-rev-cards .ap-rev-card');
    return card ? card.outerHTML.slice(0, 1500) : 'no card';
  });
  console.log('CARD HTML:\n' + html);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
