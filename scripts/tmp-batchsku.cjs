/* 验证：勾选列表商品 → 列头上方选条「已选 N 条＋编辑商品信息」→ 批量弹窗（商品信息列＋SKU 关键信息）→ 保存回写种子 */
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
  const check = (r) => page.click(`section.page.show .create-table tbody tr:nth-child(${r}) td:first-child .ib-check`);
  /* 行内 input 顺序：SKU名称0 商品编码1 售价2 利润3 利润率4 库存数5（系列编码/成本价只读无 input） */
  const rowInput = (r, c) => page.locator(`.cp-quick-table tbody tr:nth-child(${r}) input`).nth(c);

  /* ---------- 淘宝路由：勾选 2 件 → 选条 → 批量弹窗 ---------- */
  await gotoRoute('淘宝');
  results['tb.noBar'] = (await page.locator('.cp-selbar').count()) === 0;
  await check(1);
  await check(2);
  results['tb.bar'] = (await page.locator('.cp-selbar-count').textContent()).includes('2');
  await page.click('section.page.show .cp-selbar button:text-is("编辑商品信息")');
  await page.waitForSelector('.modal .cp-quick-table');
  const headTxt = await page.locator('.modal-head').textContent();
  results['tb.title'] = headTxt.includes('批量编辑商品') && headTxt.includes('已选 2 件商品');
  const heads = await page.locator('.cp-quick-table th').allTextContents();
  results['tb.heads'] = JSON.stringify(heads) === JSON.stringify(['SKU图片', 'SKU名称', '商品编码', '系列编码', '成本价', '售价', '利润', '利润率', '库存数', '操作']);
  /* 不展示商品信息列；同种子商品勾选 2 件 → SKU 去重只铺 4 行 */
  results['tb.rows'] = (await page.locator('.cp-quick-table tbody tr').count()) === 4;
  results['tb.noGoods'] = (await page.locator('.cp-quick-goods').count()) === 0;
  await page.screenshot({ path: `${OUT}/tmp-batchsku.png` });
  /* 列头批量编辑：售价列浮层统一 66.00 → 全 4 行售价/利润联动（66-99=-33.00） */
  await page.click('.cp-quick-table th:has-text("售价") .cp-quick-col-btn');
  await page.fill('.cp-quick-colpop .ib-input', '66.00');
  await page.click('.cp-quick-colpop button:text-is("应用")');
  results['tb.colPrice'] = (await rowInput(1, 2).inputValue()) === '66.00'
    && (await rowInput(4, 2).inputValue()) === '66.00'
    && (await rowInput(1, 3).inputValue()) === '-33.00';
  /* 改首行售价保存 → 回写种子；单件入口重开同步 */
  await rowInput(1, 2).fill('77.00');
  await page.click('.modal-foot button:text-is("保存")');
  await page.waitForSelector('.toast:has-text("SKU 信息已保存（2 件商品）")');
  results['tb.closed'] = (await page.locator('.cp-quick-table').count()) === 0;
  await page.locator('section.page.show .cp-quick-sku').first().click();
  await page.waitForSelector('.cp-quick-table');
  results['tb.sync'] = (await rowInput(1, 2).inputValue()) === '77.00';
  await page.click('.modal-foot button:text-is("取消")');
  /* 逐行取消勾选 → 选条收起 */
  await check(1);
  await check(2);
  results['tb.barGone'] = (await page.locator('.cp-selbar').count()) === 0;

  /* ---------- 京麦路由：勾选 1 件 → 批量弹窗列名 ---------- */
  await gotoRoute('京麦');
  await check(1);
  await page.click('section.page.show .cp-selbar button:text-is("编辑商品信息")');
  await page.waitForSelector('.modal .cp-quick-table');
  const jmHeads = await page.locator('.cp-quick-table th').allTextContents();
  results['jm.heads'] = JSON.stringify(jmHeads) === JSON.stringify(['SKU图片', 'SKU名称', '商家编码', '系列编码', '成本价', '京东价', '利润', '利润率', '库存数', '操作']);
  results['jm.seed'] = (await rowInput(1, 2).inputValue()) === '39.90';
  await page.screenshot({ path: `${OUT}/tmp-batchsku-jm.png` });
  await page.click('.modal-head .x');

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => v !== true);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL ${fail.length}` : 'ALL PASS');
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
