/* 验证：反馈详情抽屉加宽 + 元信息布局 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  // 首页意见反馈模块：点击已回复的条目
  await page.locator('.ap-fb-item:has-text("已回复")').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.locator('.ap-fb-item:has-text("已回复")').first().click();
  await page.waitForSelector('.ap-drawer-fb');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-fbdetail-1.png` });

  // 关闭，再打开待回复条目（消息中心-系统开发者-查看反馈）
  await page.click('.ap-drawer-fb .ap-drawer-foot .ap-btn-plain');
  await page.waitForTimeout(300);
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
  await page.click('.ap-msg-tabs button:has-text("系统开发者")');
  await page.waitForTimeout(200);
  await page.click('.ap-msg-item .ap-link:has-text("查看反馈")');
  await page.waitForSelector('.ap-drawer-fb');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-fbdetail-2.png` });

  await browser.close();
  console.log('ac fbdetail shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
