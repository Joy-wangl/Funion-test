/* 验证：消息中心间距/图标/状态筛选 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-msg4-app.png` });

  // 状态筛选：待回复
  await page.click('.ap-msg-filter .ap-fb-tabs button:has-text("待回复")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-msg4-pending.png` });

  // 状态筛选：已回复
  await page.click('.ap-msg-filter .ap-fb-tabs button:has-text("已回复")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-msg4-done.png` });

  // 系统开发者 tab + 待回复
  await page.click('.ap-msg-tabs button:has-text("系统反馈")');
  await page.waitForTimeout(200);
  await page.click('.ap-msg-filter .ap-fb-tabs button:has-text("待回复")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-msg4-sys.png` });

  await browser.close();
  console.log('ac msg4 shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
