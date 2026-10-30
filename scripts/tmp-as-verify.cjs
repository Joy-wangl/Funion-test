/* AI作图中心：一键全素材闭环验证 */
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

  /* 进入 AI作图中心 */
  await page.click('.top-tabs-item:has-text("AI作图中心")');
  await page.waitForSelector('.as-wb', { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/as-01-workbench.png` });

  /* 选择「一键全素材」 */
  const allMatBtn = page.locator('.as-act').filter({ hasText: '一键全素材' });
  await allMatBtn.click();
  await page.waitForTimeout(600);
  check('一键全素材动作高亮', await page.locator('.as-act.on').filter({ hasText: '一键全素材' }).count() === 1);

  /* 选择商品 */
  await page.locator('.as-src-tile').filter({ hasText: '选择店铺商品' }).first().click();
  await page.waitForSelector('.as-pick-grid .as-pick-card', { timeout: 10000 });
  const firstProd = page.locator('.as-pick-grid .as-pick-card').first();
  const prodTitle = (await firstProd.locator('.as-pick-title').innerText()).trim();
  await firstProd.click();
  await page.waitForTimeout(200);
  await page.click('.modal-foot button:has-text("确认选择")');
  await page.waitForTimeout(400);
  check('商品已回填', (await page.locator('.as-src-card .as-src-title').innerText()).trim() === prodTitle, prodTitle);
  await page.screenshot({ path: `${OUT}/as-02-product.png` });

  /* 选择场景 */
  await page.locator('.as-scene-card').first().click();
  await page.waitForTimeout(200);
  check('场景已选中', await page.locator('.as-scene-card.on').count() === 1);

  /* 选择风格 */
  await page.locator('.as-style-card').first().click();
  await page.waitForTimeout(200);
  check('风格已选中', await page.locator('.as-style-card.on').count() === 1);

  /* 输出参数：默认全选 6 类 */
  const chips = await page.locator('.as-param-row .as-chip.on').allInnerTexts();
  check('默认勾选全部素材类型', chips.filter((t) => /主图|详情图|SKU图|白底图|场景图/.test(t)).length >= 6, chips.join(','));

  /* 生成 */
  await page.click('.as-gen-btn');
  await page.waitForTimeout(800);
  check('进入生成中视图', await page.locator('.as-run-head').isVisible());
  await page.screenshot({ path: `${OUT}/as-03-running.png` });

  /* 等待生成完成 */
  await page.waitForSelector('.as-res-head', { timeout: 30000 });
  await page.waitForTimeout(500);
  const groupTitles = await page.locator('.as-res-group-title').allInnerTexts();
  check('结果按素材类型分组', groupTitles.length >= 4, groupTitles.join(','));
  await page.screenshot({ path: `${OUT}/as-04-result.png` });

  /* 应用到系列编码素材库 */
  await page.click('button:has-text("应用到系列编码素材库")');
  await page.waitForSelector('.modal:has-text("入库商品ID")', { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/as-05-code-modal.png` });
  await page.click('.modal-foot button:has-text("确认写入")');
  await page.waitForTimeout(600);
  const toast = await page.locator('.toast').last().innerText().catch(() => '');
  check('写入素材库成功提示', /已写入/.test(toast), toast);

  /* 切换回智能运营中心 → 系列编码素材库 */
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center', { timeout: 30000 });
  await page.click('.nav-parent:has-text("系列编码知识库")');
  await page.waitForTimeout(300);
  await page.click('.subnav:has-text("系列编码素材库")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/as-06-codekb.png` });

  /* 下钻详情验证新增素材 */
  await page.locator('.cb-lib-table tbody tr').first().locator('.sg-link:has-text("查看详情")').click();
  await page.waitForSelector('.cb-drawer', { timeout: 10000 });
  await page.waitForTimeout(500);
  const typeTabs = await page.locator('.cb-ttab').allInnerTexts();
  check('详情页展示全部素材类型', typeTabs.some((t) => /主图|详情图|SKU图|白底图|场景图/.test(t)), typeTabs.join(','));
  await page.screenshot({ path: `${OUT}/as-07-codekb-detail.png` });

  console.log(`\nRESULT pass=${ok.length} fail=${bad.length}${bad.length ? ' -> ' + bad.join(', ') : ''}`);
  await browser.close();
})();
