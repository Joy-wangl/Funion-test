/* 验证：更新闭环——点更新弹版本/内容弹窗，确认更新后徽标清除 */
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

  // 悬浮金蝶ERP（带更新按钮）→ 点更新
  const cell = page.locator('.ap-cell:has(.ap-act.update)', { hasText: '金蝶ERP' }).first();
  await cell.hover();
  await page.waitForTimeout(200);
  await cell.locator('.ap-act.update').click();
  await page.waitForSelector('.ap-modal');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-upd-modal.png` });

  // 确认更新 → 加载 → 徽标清除 + toast
  await page.click('.ap-modal-foot .ap-btn-blue');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-upd-loading.png` });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/ac-upd-done.png` });

  const left = await page.locator('.ap-cell:has(.ap-act.update)').count();
  console.log('remaining update badges:', left);

  await browser.close();
  console.log('ac update loop shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
