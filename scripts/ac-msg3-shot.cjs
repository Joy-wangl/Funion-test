/* 验证：消息中心宽抽屉 + 身份/应用维度/已读未读 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  // 打开宽抽屉（应用渠道 + 应用维度栏 + 未读）
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-msg3-app.png` });

  // 切到第二个应用（c-2）维度
  await page.click('.ap-msg-rail button >> nth=2');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-msg3-filter.png` });

  // 回全部，点击未读条目 → 已读
  await page.click('.ap-msg-rail button >> nth=0');
  await page.waitForTimeout(200);
  await page.click('.ap-msg-item.unread >> nth=0');
  await page.waitForTimeout(200);

  // 全部已读
  await page.click('.ap-msg-head-act .ap-link');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-msg3-read.png` });

  // 系统开发者 tab（类型维度栏）
  await page.click('.ap-msg-tabs button:has-text("系统开发者")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-msg3-sys.png` });

  await browser.close();
  console.log('ac msg3 shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
