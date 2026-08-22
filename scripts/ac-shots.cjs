const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 顶部 Tab 进入应用中心
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ac-page');

  // 1. 业务域视图：点击第一张卡片
  await page.click('.ac-app-card >> nth=0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'd:/Qoder/Funion/ac-verify-domain.png' });

  // 2. 所有应用
  await page.click('.ac-seg button:has-text("所有应用")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'd:/Qoder/Funion/ac-verify-all.png' });

  // 3. 我的应用
  await page.click('.ac-nav:has-text("我的应用")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'd:/Qoder/Funion/ac-verify-mine.png' });

  // 4. 使用情况
  await page.click('.ac-nav:has-text("使用情况")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'd:/Qoder/Funion/ac-verify-usage.png' });

  // 5. 数据中心
  await page.click('.ac-nav:has-text("数据中心")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'd:/Qoder/Funion/ac-verify-data.png' });

  // 6. 权限申请弹窗
  await page.click('.ac-nav:has-text("应用（业务域）")');
  await page.click('.ac-seg button:has-text("按业务域列表")');
  await page.click('.ac-menu-item:has-text("油气勘探开发")');
  await page.click('.ac-app-card:has-text("智能气田运行平台")');
  await page.click('.ac-detail-foot .ac-btn.primary');
  await page.waitForSelector('.ac-modal');
  await page.screenshot({ path: 'd:/Qoder/Funion/ac-verify-perm.png' });

  await browser.close();
  console.log('screenshots done');
})().catch((e) => { console.error(e); process.exit(1); });
