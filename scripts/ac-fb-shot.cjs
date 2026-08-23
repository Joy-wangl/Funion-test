/* 截取首页意见反馈闭环：列表卡片 / 新建抽屉 / 详情抽屉(含回复) / 提交后模拟官方回复 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(800);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-home', { timeout: 15000 });
  await page.waitForTimeout(400);

  const card = await page.$('.ap-fb-card');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await card.screenshot({ path: 'd:/Qoder/Funion/ac-verify-22-fb-card.png' });

  // 新建抽屉
  await page.click('.ap-fb-bar .ap-btn-blue');
  await page.waitForSelector('.ap-drawer');
  await page.waitForTimeout(300);
  await page.fill('.ap-drawer .ap-fb-input', '希望最佳应用榜能支持按类目筛选，方便发现小工具类的好应用。');
  await page.screenshot({ path: 'd:/Qoder/Funion/ac-verify-23-fb-create.png' });
  await page.click('.ap-drawer-foot .ap-btn-blue');
  await page.waitForTimeout(400);

  // 详情抽屉（点第二条：已有官方回复）
  await page.click('.ap-fb-item >> nth=1');
  await page.waitForSelector('.ap-fb-thread');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'd:/Qoder/Funion/ac-verify-24-fb-detail.png' });
  await page.click('.ap-drawer-head button');
  await page.waitForTimeout(300);

  // 等待模拟官方回复（4s）后看列表状态闭环
  await page.waitForTimeout(4200);
  await card.screenshot({ path: 'd:/Qoder/Funion/ac-verify-25-fb-replied.png' });

  await browser.close();
  console.log('fb shots ok');
})();
