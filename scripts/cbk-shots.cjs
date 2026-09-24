/* 系列编码知识库无头截图验证（列表+抽屉版） */
const { chromium } = require('D:/PM.funion/.playwright/package');
const path = require('path');

const OUT = path.resolve(__dirname, '../.shots-tmp');

const shots = [
  { name: 'cbk-01-list', steps: async (page) => {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.locator('.top-tabs-item', { hasText: '智能运营中心' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('.side .nav-parent', { hasText: '系列编码知识库' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('.subnav', { hasText: '系列编码素材库' }).first().click();
    await page.waitForTimeout(700);
  } },
  { name: 'cbk-02-drawer-top', steps: async (page) => {
    // 打开风险系列 XL-C300 详情抽屉（默认「类型推荐TOP10·全部」）
    await page.locator('.cb-lib-table tbody tr').filter({ hasText: 'XL-C300' }).first().click();
    await page.waitForTimeout(600);
  } },
  { name: 'cbk-03-drawer-type', steps: async (page) => {
    // 切到单一类型 tab（主图）
    await page.locator('.cb-ttab', { hasText: '主图' }).first().click();
    await page.waitForTimeout(400);
  } },
  { name: 'cbk-04-drawer-codes', steps: async (page) => {
    // 下拉切「全部素材」→ 商品ID堆叠卡
    await page.locator('.cb-viewsel .bselect-trigger').click();
    await page.waitForTimeout(200);
    await page.locator('.bselect-opt', { hasText: '全部素材' }).first().click();
    await page.waitForTimeout(400);
  } },
  { name: 'cbk-04b-search', steps: async (page) => {
    // 点搜索图标展开输入框（隐藏式搜索）
    await page.locator('.cb-idsearchbtn').first().click();
    await page.waitForTimeout(300);
  } },
  { name: 'cbk-05-code-materials', steps: async (page) => {
    // 点单个商品编码豆腐块 → 该编码下ID卡；再点ID卡展开素材
    await page.locator('.cb-cblock', { hasText: 'TB-5102' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('.cb-idcard').first().click();
    await page.waitForTimeout(400);
  } },
  { name: 'cbk-06-preview', steps: async (page) => {
    // 点第一张素材卡 → 看图浮层（仅大图）
    await page.locator('.cb-drawer-body .cb-card').first().click();
    await page.waitForTimeout(400);
  } },
  { name: 'cbk-07-close', steps: async (page) => {
    // 关看图浮层与抽屉，回列表态
    await page.locator('.cb-pvclose').first().click();
    await page.waitForTimeout(200);
    await page.locator('.cb-drawer-close').first().click();
    await page.waitForTimeout(400);
  } },
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  for (const s of shots) {
    try {
      await s.steps(page);
      await page.screenshot({ path: path.join(OUT, s.name + '.png'), fullPage: false });
      console.log('OK', s.name);
    } catch (e) {
      console.error('FAIL', s.name, e.message);
    }
  }
  await browser.close();
})();
