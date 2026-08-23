/* 截取首页贡献榜卡片：个人(收起/展开)/部门/最佳应用 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(800);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-home', { timeout: 15000 });
  await page.waitForTimeout(400);
  const card = await page.$('.ap-home-rank-row');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await card.screenshot({ path: 'd:/Qoder/Funion/ac-verify-17-rank-person.png' });

  await page.click('.ap-rank-person >> nth=0 >> .ap-rank-row');
  await page.waitForTimeout(300);
  await card.screenshot({ path: 'd:/Qoder/Funion/ac-verify-18-rank-open.png' });

  await page.click('.ap-rank-tabs button:has-text("部门贡献榜")');
  await page.waitForTimeout(300);
  await card.screenshot({ path: 'd:/Qoder/Funion/ac-verify-19-rank-dept.png' });

  await page.click('.ap-rank-tabs button:has-text("最佳应用榜")');
  await page.waitForTimeout(300);
  await card.screenshot({ path: 'd:/Qoder/Funion/ac-verify-20-rank-best.png' });

  // 切换时间维度近7天 → 个人榜
  await page.click('.ap-rank-bar .bselect-trigger');
  await page.click('.bselect-opt:has-text("近7天")');
  await page.click('.ap-rank-tabs button:has-text("个人贡献榜")');
  await page.waitForTimeout(300);
  await card.screenshot({ path: 'd:/Qoder/Funion/ac-verify-21-rank-7d.png' });

  await browser.close();
  console.log('rank shots ok');
})();
