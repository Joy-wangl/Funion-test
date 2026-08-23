/* 验证：评价图片上传 + 评价区图片展示 */
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

  await page.click('.ap-cell:has-text("金蝶ERP") >> nth=0');
  await page.waitForSelector('.ap-detail');
  await page.waitForTimeout(300);

  // 评价卡片带种子配图
  await page.locator('.ap-rev-cards').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-revimg-cards.png` });

  // 展开表单并上传图片
  await page.click('.ap-rev-form-closed');
  await page.waitForSelector('.ap-rev-form');
  await page.setInputFiles('.ap-rev-up-add input', ['public/products/main.png', 'public/products/serum.png']);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/ac-revimg-up.png` });

  // 填写并提交
  await page.click('.ap-rev-pick button >> nth=4');
  await page.fill('.ap-rev-form textarea', '界面清爽，配图上传也很方便。');
  await page.click('.ap-rev-foot .ap-btn-blue');
  await page.waitForTimeout(400);
  await page.locator('.ap-rev-cards').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-revimg-posted.png` });

  // 全部评价弹窗
  await page.click('.ap-sec-head:has-text("评分及评论") .ap-link');
  await page.waitForSelector('.ap-modal-lg');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-revimg-all.png` });

  await browser.close();
  console.log('ac revimg shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
