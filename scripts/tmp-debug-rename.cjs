/**
 * 调试：检查改名后 specs 数据和 SKU 表状态
 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });

  await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('.top-tabs-item', { timeout: 60000 });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.subnav', { timeout: 10000 });

  /* 导航到淘宝 */
  const t = page.locator('.subnav:text-is("淘宝")');
  if (!await t.isVisible().catch(() => false)) {
    await page.locator('.nav-parent:has-text("商品创建")').click();
    await page.waitForTimeout(400);
  }
  await t.click();
  await page.waitForTimeout(800);

  /* 打开详情 */
  await page.waitForSelector('section.show .create-table tbody tr', { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.locator('section.show .create-ops a:has-text("详情")').first().click({ force: true });
  await page.waitForSelector('section.show .sgd-hero', { timeout: 10000 });

  /* 编辑 */
  await page.locator('.cpd-top-acts .sg-btn:has-text("编辑")').click();
  await page.waitForTimeout(300);

  /* 读取改名前的状态 */
  const before = await page.evaluate(() => {
    const inputs = document.querySelectorAll('.cpd-spec-card:first-child .cpd-chip-input');
    const vals = Array.from(inputs).map(i => i.value);
    /* 读取 SKU 表所有行的组合名列 */
    const rows = document.querySelectorAll('.cpd-sku-table tbody tr');
    const combos = Array.from(rows).map(r => {
      const tds = r.querySelectorAll('td');
      return Array.from(tds).map(td => td.textContent.trim());
    });
    return { vals, combos: combos.slice(0, 3) };
  });
  console.log('改名前 specs[0] values:', before.vals);
  console.log('改名前 SKU 前3行:', JSON.stringify(before.combos));

  /* 改名：用 click + type + click body */
  const firstChip = page.locator('.cpd-spec-card:first-child .cpd-chip-input').first();
  await firstChip.click();
  await page.waitForTimeout(100);
  await firstChip.press('Control+a');
  await page.waitForTimeout(50);
  await firstChip.press('Backspace');
  await page.waitForTimeout(50);
  await firstChip.type('黑色_test', { delay: 15 });
  await page.waitForTimeout(100);
  /* 点击页面空白处触发 blur */
  await page.locator('.sgd-sec-title:has-text("商品SKU")').click();
  await page.waitForTimeout(600);

  /* 读取改名后的状态 */
  const after = await page.evaluate(() => {
    const inputs = document.querySelectorAll('.cpd-spec-card:first-child .cpd-chip-input');
    const vals = Array.from(inputs).map(i => i.value);
    const rows = document.querySelectorAll('.cpd-sku-table tbody tr');
    const combos = Array.from(rows).map(r => {
      const tds = r.querySelectorAll('td');
      return Array.from(tds).map(td => td.textContent.trim());
    });
    /* 检查第一个 spec card 的 reactive data */
    return { vals, combos: combos.slice(0, 3), rowCount: rows.length };
  });
  console.log('改名后 specs[0] values:', after.vals);
  console.log('改名后 SKU 前3行:', JSON.stringify(after.combos));
  console.log('改名后 SKU 行数:', after.rowCount);

  await page.screenshot({ path: `${OUT}/tmp-debug-rename.png`, fullPage: true });

  /* 也检查 Vue 组件的 reactive data */
  const vueState = await page.evaluate(() => {
    /* 尝试从 Vue devtools 或 __vue_app__ 获取数据 */
    const app = document.querySelector('#app');
    if (app && app.__vue_app__) {
      return 'Vue app found';
    }
    return 'No Vue app found';
  });
  console.log('Vue state:', vueState);

  await browser.close();
})();
