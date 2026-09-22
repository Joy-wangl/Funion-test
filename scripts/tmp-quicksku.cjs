/* 验证：列表「详」字 SKU 快捷编辑弹窗全字段（SKU图片/名称/商品编码/系列编码/成本价/售价/利润/利润率/库存数/操作）——编辑回写、取消丢弃、复制/删除、详情同步 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForSelector('.top-tabs-item', { timeout: 60000 });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');

  const gotoRoute = async (name) => {
    if (!(await page.locator(`.subnav:text-is("${name}")`).first().isVisible().catch(() => false))) {
      await page.click('.nav-text:has-text("商品创建")');
    }
    await page.click(`.subnav:text-is("${name}")`);
    await page.waitForSelector('section.page.show .create-table:visible');
  };
  /* 行内 input 顺序：SKU名称0 商品编码1 售价2 利润3 利润率4 库存数5（系列编码/成本价只读无 input） */
  const rowInput = (r, c) => page.locator(`.cp-quick-table tbody tr:nth-child(${r}) input`).nth(c);
  const cell = (r, n) => page.locator(`.cp-quick-table tbody tr:nth-child(${r}) td:nth-child(${n})`);
  const HEADS_TB = ['SKU图片', 'SKU名称', '商品编码', '系列编码', '成本价', '售价', '利润', '利润率', '库存数', '操作'];
  const HEADS_JM = ['SKU图片', 'SKU名称', '商家编码', '系列编码', '成本价', '京东价', '利润', '利润率', '库存数', '操作'];

  /* ---------- 淘宝路由 ---------- */
  await gotoRoute('淘宝');
  results['tb.chip'] = await page.locator('section.page.show .cp-quick-sku').first().isVisible();
  /* 平台徽章已换官方 LOGO */
  results['tb.logo'] = await page.locator('section.page.show .create-platform-logo').first().isVisible();
  await page.locator('section.page.show .cp-quick-sku').first().click();
  await page.waitForSelector('.modal .cp-quick-table');
  const heads = await page.locator('.cp-quick-table th').allTextContents();
  results['tb.heads'] = JSON.stringify(heads) === JSON.stringify(HEADS_TB);
  results['tb.rows'] = (await page.locator('.cp-quick-table tbody tr').count()) === 4;
  results['tb.seed'] = (await rowInput(1, 2).inputValue()) === '2026.00'
    && (await rowInput(1, 5).inputValue()) === '120'
    && (await rowInput(1, 1).inputValue()) === 'JSUZJDAO-001*2'
    && (await rowInput(1, 0).inputValue()) === '黑a款';
  /* SKU名称可编辑（有 input）；系列编码只读（纯文本无 input） */
  results['tb.nameInput'] = (await cell(1, 2).locator('input').count()) === 1;
  results['tb.seriesReadonly'] = (await cell(1, 4).textContent()) === '编码A'
    && (await cell(1, 4).locator('input').count()) === 0;
  /* 成本价只读：单元格纯文本无 input */
  results['tb.costReadonly'] = (await cell(1, 5).textContent()) === '99.00'
    && (await cell(1, 5).locator('input').count()) === 0;
  /* 商品编码清空失焦 → 系列编码/成本价 0.00 */
  await rowInput(1, 1).fill('');
  await page.click('.modal-head');
  results['tb.codeEmpty'] = (await cell(1, 4).textContent()) === '0.00' && (await cell(1, 5).textContent()) === '0.00';
  /* 输入商品编码点击空白 → toast 查询提示 → 完成后回填系列编码/成本价 */
  await rowInput(1, 1).fill('JSUZJDAO-001*2');
  await page.click('.modal-head');
  results['tb.codeQueryToast'] = await page.locator('.toast:has-text("正在查询系列编码信息")').isVisible().catch(() => false);
  await page.waitForTimeout(900);
  results['tb.codeQuery'] = (await cell(1, 4).textContent()) === '编码A' && (await cell(1, 5).textContent()) === '99.00';
  /* 利润/利润率初始联动值：2026-99=1927.00 / 95.1 */
  results['tb.profit'] = (await rowInput(1, 3).inputValue()) === '1927.00' && (await rowInput(1, 4).inputValue()) === '95.1';
  /* 改利润 → 售价/利润率同步：99+500=599.00 / 83.5 */
  await rowInput(1, 3).fill('500');
  results['tb.syncProfit'] = (await rowInput(1, 2).inputValue()) === '599.00' && (await rowInput(1, 4).inputValue()) === '83.5';
  /* 改利润率 → 售价/利润同步：99÷(1-50%)=198.00 / 99.00 */
  await rowInput(1, 4).fill('50');
  results['tb.syncRate'] = (await rowInput(1, 2).inputValue()) === '198.00' && (await rowInput(1, 3).inputValue()) === '99.00';
  /* 列头批量编辑 icon：库存数列浮层统一改整列 */
  results['tb.colBtn'] = (await page.locator('.cp-quick-table th .cp-quick-col-btn').count()) === 4;
  await page.click('.cp-quick-table th:has-text("库存数") .cp-quick-col-btn');
  await page.fill('.cp-quick-colpop .ib-input', '777');
  await page.click('.cp-quick-colpop button:text-is("应用")');
  results['tb.colApply'] = (await rowInput(1, 5).inputValue()) === '777'
    && (await rowInput(4, 5).inputValue()) === '777'
    && (await page.locator('.cp-quick-colpop').count()) === 0;
  await page.screenshot({ path: `${OUT}/tmp-quicksku.png` });
  /* 改名称/售价/库存保存 → 回写种子 */
  await rowInput(1, 0).fill('黑a款改');
  await rowInput(1, 2).fill('88.00');
  await rowInput(1, 5).fill('999');
  await page.click('.modal-foot button:text-is("保存")');
  await page.waitForSelector('.toast:has-text("SKU 信息已保存")');
  results['tb.closed'] = (await page.locator('.cp-quick-table').count()) === 0;
  /* 重开：回写生效（含名称）；再改后取消 → 丢弃 */
  await page.locator('section.page.show .cp-quick-sku').first().click();
  await page.waitForSelector('.cp-quick-table');
  results['tb.saved'] = (await rowInput(1, 2).inputValue()) === '88.00' && (await rowInput(1, 5).inputValue()) === '999'
    && (await rowInput(1, 0).inputValue()) === '黑a款改';
  await rowInput(1, 5).fill('1');
  await page.click('.modal-foot button:text-is("取消")');
  await page.locator('section.page.show .cp-quick-sku').first().click();
  await page.waitForSelector('.cp-quick-table');
  results['tb.cancel'] = (await rowInput(1, 5).inputValue()) === '999';
  /* 复制：行后插入一致行；删除：移除 draft 行 */
  await page.click('.cp-quick-table tbody tr:nth-child(1) .cp-quick-op:text-is("复制")');
  results['tb.copy'] = (await page.locator('.cp-quick-table tbody tr').count()) === 5
    && (await rowInput(2, 0).inputValue()) === (await rowInput(1, 0).inputValue());
  await page.click('.cp-quick-table tbody tr:nth-child(5) .cp-quick-op:text-is("删除")');
  results['tb.del'] = (await page.locator('.cp-quick-table tbody tr').count()) === 4;
  /* 复制后改价保存 → 种子新增 SKU；再删除保存 → 还原 */
  await page.click('.cp-quick-table tbody tr:nth-child(1) .cp-quick-op:text-is("复制")');
  await rowInput(5, 2).fill('55.00');
  await page.click('.modal-foot button:text-is("保存")');
  await page.waitForSelector('.toast:has-text("SKU 信息已保存")');
  await page.locator('section.page.show .cp-quick-sku').first().click();
  await page.waitForSelector('.cp-quick-table');
  results['tb.copySave'] = (await page.locator('.cp-quick-table tbody tr').count()) === 5
    && (await rowInput(5, 2).inputValue()) === '55.00';
  await page.click('.cp-quick-table tbody tr:nth-child(5) .cp-quick-op:text-is("删除")');
  await page.click('.modal-foot button:text-is("保存")');
  await page.locator('section.page.show .cp-quick-sku').first().click();
  await page.waitForSelector('.cp-quick-table');
  results['tb.delSave'] = (await page.locator('.cp-quick-table tbody tr').count()) === 4;
  await page.click('.modal-head .x');

  /* 详情 SKU 表同步种子库存 999 / 售价 88.00 */
  await page.click('section.page.show .create-table tbody tr:nth-child(1) td:last-child a:text-is("详情")');
  await page.waitForSelector('.cpd-tsku');
  const skuTxt = await page.locator('.cpd-tsku tbody tr').first().textContent();
  results['tb.detailSync'] = skuTxt.includes('999') && skuTxt.includes('88.00');
  await page.click('.sgd-back');

  /* ---------- 京麦路由 ---------- */
  await gotoRoute('京麦');
  await page.locator('section.page.show .cp-quick-sku').first().click();
  await page.waitForSelector('.cp-quick-table');
  const jmHeads = await page.locator('.cp-quick-table th').allTextContents();
  results['jm.heads'] = JSON.stringify(jmHeads) === JSON.stringify(HEADS_JM);
  results['jm.seed'] = (await rowInput(1, 2).inputValue()) === '39.90' && (await cell(1, 5).textContent()) === '25.00';
  await rowInput(1, 2).fill('29.90');
  await page.click('.modal-foot button:text-is("保存")');
  await page.waitForSelector('.toast:has-text("SKU 信息已保存")');
  await page.locator('section.page.show .cp-quick-sku').first().click();
  await page.waitForSelector('.cp-quick-table');
  results['jm.saved'] = (await rowInput(1, 2).inputValue()) === '29.90';
  await page.screenshot({ path: `${OUT}/tmp-quicksku-jm.png` });
  await page.click('.modal-head .x');

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => v !== true);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL ${fail.length}` : 'ALL PASS');
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
