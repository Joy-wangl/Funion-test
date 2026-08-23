/* 验证：上新描述展示 + 创作者新建/更新描述入口 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(600);

  // 首页：应用上新列表带更新描述
  await page.screenshot({ path: `${OUT}/ac-note-1-home.png` });

  // 我的应用 → 上传新创作：上新描述字段
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.click('text=上传新创作');
  await page.waitForSelector('.ap-create');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-note-2-create.png` });

  // 返回 → 编辑我的应用：更新描述字段
  await page.click('.ap-form-foot .ap-btn-plain');
  await page.waitForTimeout(400);
  await page.hover('.ap-grid.mine .ap-cell >> nth=0');
  await page.click('.ap-grid.mine .ap-cell >> nth=0 >> .ap-act.caret');
  await page.waitForTimeout(300);
  await page.click('text=编辑应用');
  await page.waitForSelector('.ap-create');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-note-3-edit.png` });

  await browser.close();
  console.log('ac note shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
