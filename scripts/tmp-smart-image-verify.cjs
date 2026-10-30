const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const ok = [];
const bad = [];
const check = (name, cond, extra = '') => {
  (cond ? ok : bad).push(name);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' | ' + extra : ''}`);
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 950 } });
  page.setDefaultTimeout(60000);
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  /* 顶部 tab 已无 AI作图中心 */
  check('顶部 tab 无 AI作图中心', await page.locator('.top-tabs-item:has-text("AI作图中心")').count() === 0);

  /* 进入 智能运营中心 */
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center', { timeout: 30000 });

  /* 展开系列编码知识库 */
  await page.click('.nav-parent:has-text("系列编码知识库")');
  await page.waitForTimeout(400);
  const subs = await page.locator('.subnav-wrap:has(~ .nav-parent:has-text("设置")) .subnav, .nav-parent:has-text("系列编码知识库") + .subnav-wrap .subnav').allInnerTexts();
  // simpler: all subnav texts under the open codeKb group
  const allSubs = await page.locator('.subnav').allInnerTexts();
  check('存在 智能作图 子导航', allSubs.some((t) => t.includes('智能作图')), allSubs.join(','));

  await page.click('.subnav:has-text("智能作图")');
  await page.waitForSelector('.si-studio', { timeout: 30000 });
  await page.waitForTimeout(800);
  check('智能作图页面加载', await page.locator('.si-studio').count() === 1);
  await page.screenshot({ path: `${OUT}/si-01-studio.png` });

  /* 选择商品 */
  await page.locator('.si-upload-btn').filter({ hasText: '选择店铺商品' }).first().click();
  await page.waitForSelector('.as-pick-grid .as-pick-card', { timeout: 10000 });
  const firstProd = page.locator('.as-pick-grid .as-pick-card').first();
  const prodTitle = (await firstProd.locator('.as-pick-title').innerText()).trim();
  await firstProd.click();
  await page.waitForTimeout(200);
  await page.click('.modal-foot button:has-text("确认选择")');
  await page.waitForTimeout(400);
  check('商品已回填', (await page.locator('.si-prod-name').innerText()).includes(prodTitle.slice(0, 12)), prodTitle);
  await page.screenshot({ path: `${OUT}/si-02-product.png` });

  /* 选择场景和风格（默认收起，先展开） */
  await page.locator('.si-prop-title.collapse').filter({ hasText: '场景选择' }).click();
  await page.waitForTimeout(200);
  await page.locator('.si-scene-pill').first().click();
  await page.waitForTimeout(200);
  await page.locator('.si-prop-title.collapse').filter({ hasText: '出图风格' }).click();
  await page.waitForTimeout(200);
  await page.locator('.si-style-card').first().click();
  await page.waitForTimeout(200);

  /* 生成 */
  await page.click('.si-gen-btn');
  await page.waitForSelector('.si-task-tile', { timeout: 30000 });
  /* 等待全部 6 张结果产出（每批间隔 650ms） */
  await page.waitForFunction(() => document.querySelectorAll('.si-task-tile').length >= 6, { timeout: 30000 });
  await page.waitForTimeout(500);
  const groupTitles = await page.locator('.si-task-group').allInnerTexts();
  check('结果按素材类型分组', groupTitles.length >= 4, groupTitles.join(','));
  await page.screenshot({ path: `${OUT}/si-03-results.png` });

  /* 应用到系列编码素材库 */
  await page.click('button:has-text("批量应用到系列编码素材库")');
  await page.waitForSelector('.si-form', { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/si-04-code-modal.png` });
  await page.click('.si-modal-btn.primary');
  await page.waitForTimeout(600);
  const toast = await page.locator('.toast').last().innerText().catch(() => '');
  check('写入素材库成功提示', /已写入/.test(toast), toast);

  /* 切换回系列编码素材库确认 */
  await page.click('.subnav:has-text("系列编码素材库")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/si-05-codekb.png` });

  console.log(`\nRESULT pass=${ok.length} fail=${bad.length}${bad.length ? ' -> ' + bad.join(', ') : ''}`);
  await browser.close();
})();
