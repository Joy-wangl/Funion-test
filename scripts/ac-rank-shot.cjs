/* 单独截取首页贡献榜卡片（个人榜含应用 chips） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(800);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-home', { timeout: 15000 });
  await page.waitForTimeout(400);
  const card = await page.$('.ap-home > .ap-home-card:last-of-type');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await card.screenshot({ path: 'd:/Qoder/Funion/ac-verify-17-rank-person.png' });
  await browser.close();
  console.log('rank shot ok');
})();
