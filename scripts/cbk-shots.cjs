/* 系列编码知识库无头截图验证（列表+抽屉版） */
const { chromium } = require('D:/Funion/.playwright/package');
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
  { name: 'cbk-04-drawer-all', steps: async (page) => {
    // 切「全部素材」分页视图
    await page.locator('.cb-ttab', { hasText: '全部' }).first().click();
    await page.waitForTimeout(200);
    await page.locator('.cb-seg button', { hasText: '全部素材' }).click();
    await page.waitForTimeout(400);
  } },
  { name: 'cbk-05-drawer-all-p2', steps: async (page) => {
    // 翻到第 2 页（若存在）
    const p2 = page.locator('.cb-mini-pager .ib-pagebtn', { hasText: '2' });
    if (await p2.count()) { await p2.first().click(); await page.waitForTimeout(400); }
  } },
  { name: 'cbk-06-lineage', steps: async (page) => {
    await page.locator('.cb-drawer-close').first().click();
    await page.waitForTimeout(200);
    await page.locator('.subnav', { hasText: '系列编码血缘图谱' }).first().click();
    await page.waitForTimeout(800);
  } },
  { name: 'cbk-07-lineage-list', steps: async (page) => {
    await page.locator('.subnav', { hasText: '血缘关系列表' }).first().click();
    await page.waitForTimeout(600);
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
