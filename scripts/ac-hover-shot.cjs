/* 验证：卡片悬浮时按钮直接实底（更新橙/添加蓝/组合蓝） */
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

  // 悬浮带「更新」按钮的卡片
  await page.hover('.ap-cell:has(.ap-act.update) >> nth=0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-hover-1-update.png` });

  // 悬浮带「添加」按钮的卡片
  await page.hover('.ap-cell:has(.ap-act.plain):not(:has(.ap-open-wrap)) >> nth=0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-hover-2-add.png` });

  // 我的应用：组合按钮（打开+ caret）实底
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.hover('.ap-grid.mine .ap-cell >> nth=0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-hover-3-mine.png` });

  await browser.close();
  console.log('ac hover shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
