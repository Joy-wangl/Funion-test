/* 验证：同名应用抽查评价数（hb-1/hb-4/c-1/a-1 均应 10 条） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

  for (const nth of [0, 3, 12, 14]) {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(600);
    await page.click('.top-tabs-item:has-text("应用中心")');
    await page.waitForTimeout(500);
    await page.click('.ap-cats button:has-text("全部")');
    await page.waitForTimeout(400);
    await page.click(`.ap-grid .ap-cell >> nth=${nth}`);
    await page.waitForSelector('.ap-detail');
    await page.waitForTimeout(300);
    const count = await page.evaluate(() => document.querySelectorAll('.ap-rev-cards .ap-rev-card').length);
    const replies = await page.evaluate(() => document.querySelectorAll('.ap-rev-cards .ap-rev-reply').length);
    console.log(`cell#${nth} cards=${count} replies=${replies}`);
    if (nth === 14) {
      await page.locator('.ap-rev-cards').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/ac-rev10-a1.png` });
    }
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
