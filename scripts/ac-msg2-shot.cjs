/* 验证：消息中心抽屉化 + 闭环跳转（查看应用/查看反馈） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  // 打开消息中心抽屉
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-msg2-drawer.png` });

  // 回复一条待回复评价
  await page.click('.ap-msg-item:has-text("期待更多模板") .ap-msg-foot .ap-link');
  await page.waitForTimeout(200);
  await page.fill('.ap-msg-replyform input', '模板库已在规划中，敬请期待！');
  await page.click('.ap-msg-replyform button.on');
  await page.waitForTimeout(300);

  // 查看应用 → 跳详情
  await page.click('.ap-msg-item:has-text("期待更多模板") .ap-msg-top-act .ap-link');
  await page.waitForSelector('.ap-detail');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-msg2-jumpapp.png` });

  // 再开抽屉 → 系统开发者 → 查看反馈
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
  await page.waitForTimeout(200);
  await page.click('.ap-msg-tabs button:has-text("系统开发者")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-msg2-sys.png` });

  await page.click('.ap-msg-item:has-text("一键展开所有人的应用") .ap-msg-top-act .ap-link');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-msg2-fbdetail.png` });

  await browser.close();
  console.log('ac msg2 shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
