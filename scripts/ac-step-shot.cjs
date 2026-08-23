/* 验证：新建两步 + 类型联动 + 编辑预填 + 详情无评分 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  // 进入创建
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.click('text=上传新创作');
  await page.waitForSelector('.ap-create');
  await page.screenshot({ path: `${OUT}/ac-step-1.png` });

  // 第一步必填 → 下一步
  await page.fill('.ap-form input[maxlength="10"]', '两步测试');
  await page.click('.ap-upload.icon');
  await page.click('.ap-upload.main');
  await page.click('.ap-form-foot .ap-btn-blue');
  await page.waitForSelector('.ap-radio-line');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-step-2-empty.png` });

  // Web应用 + 文件托管 + 发布线上（权限管理出现）
  await page.click('.ap-cat-select .bselect-trigger');
  await page.click('.bselect-opt:has-text("Web应用")');
  await page.waitForTimeout(200);
  await page.click('.ap-upload-file');
  await page.click('.ap-radio:has-text("发布线上")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-step-2-web.png` });

  // EXE程序 + 运行文件
  await page.click('.ap-cat-select .bselect-trigger');
  await page.click('.bselect-opt:has-text("EXE程序")');
  await page.waitForTimeout(200);
  await page.fill('input[placeholder="遵循语义化版本规范(主版本.次版本.修订号)"]', 'v1.0.1');
  await page.click('.ap-upload-file');
  await page.click('.ap-run-line .ap-link');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-step-2-exe.png` });

  // 浏览器插件
  await page.click('.ap-cat-select .bselect-trigger');
  await page.click('.bselect-opt:has-text("浏览器插件")');
  await page.waitForTimeout(200);
  await page.click('.ap-upload-file');
  await page.screenshot({ path: `${OUT}/ac-step-2-plugin.png` });

  // 提交创作
  await page.click('.ap-form-foot .ap-btn-blue');
  await page.waitForTimeout(400);

  // 编辑应用：两步预填
  await page.locator('.ap-grid.mine .ap-cell').first().locator('.ap-act.caret').click();
  await page.waitForTimeout(200);
  await page.click('text=编辑应用');
  await page.waitForSelector('.ap-create');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-edit-1.png` });
  await page.click('.ap-form-foot .ap-btn-blue');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-edit-2.png` });

  // 详情无评分
  await page.click('.ap-create-head .ap-back');
  await page.waitForTimeout(300);
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForTimeout(300);
  await page.click('.ap-cell >> nth=0');
  await page.waitForSelector('.ap-detail');
  const hasRev = await page.$('.ap-rev');
  console.log('detail has review block:', !!hasRev);
  await page.screenshot({ path: `${OUT}/ac-detail-norate.png` });

  await browser.close();
  console.log('ac step shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
