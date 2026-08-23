/* 验证：小蜜蜂A/B/C 改名 + 各 10 条评价（含图/含回复） */
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
  await page.screenshot({ path: `${OUT}/ac-bee-list.png` });

  for (const name of ['小蜜蜂A', '小蜜蜂B', '小蜜蜂C']) {
    await page.click(`.ap-cell:has-text("${name}") >> nth=0`);
    await page.waitForSelector('.ap-detail');
    await page.waitForTimeout(300);
    const count = await page.evaluate(() => document.querySelectorAll('.ap-rev-cards .ap-rev-card').length);
    const replies = await page.evaluate(() => document.querySelectorAll('.ap-rev-cards .ap-rev-reply').length);
    const imgs = await page.evaluate(() => document.querySelectorAll('.ap-rev-cards .ap-rev-imgs img').length);
    const both = await page.evaluate(() => [...document.querySelectorAll('.ap-rev-cards .ap-rev-card')].filter((c) => c.querySelector('.ap-rev-imgs') && c.querySelector('.ap-rev-reply')).length);
    const tip = await page.evaluate(() => document.querySelectorAll('.ap-rev-tip').length);
    console.log(`${name} cards=${count} replies=${replies} imgs=${imgs} both=${both} tips=${tip}`);
    if (name === '小蜜蜂B') {
      await page.locator('.ap-rev-cards').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/ac-bee-b.png` });
    }
    await page.click('.ap-back');
    await page.waitForTimeout(400);
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
