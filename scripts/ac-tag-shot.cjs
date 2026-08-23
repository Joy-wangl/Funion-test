/* 验证：标签可选已有+弹窗新建（名称+拾色器）、卡片去评分 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  // 卡片不再展示评分
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-tag-0-cards.png` });

  // 上传新创作 → 标签弹层（已有标签可选 + 新建标签入口）
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.click('text=上传新创作');
  await page.waitForSelector('.ap-create');
  await page.click('.ap-tag-add');
  await page.waitForSelector('.ap-tag-pop');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-tag-1-pop.png` });

  // 新建标签弹窗：名称 + 拾色器
  await page.click('.ap-tag-opt.new');
  await page.waitForSelector('.ap-tm-colors');
  await page.fill('.ap-tm-field input', '限时');
  await page.click('.ap-tm-swatch >> nth=4');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-tag-2-modal.png` });

  // 确定 → 彩色标签 chip
  await page.click('.ap-modal-foot .ap-btn-blue');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-tag-3-done.png` });

  await browser.close();
  console.log('ac tag shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
