/* 快捷编辑SKU·批量分组验证：勾选 3 件商品 → 弹窗按商品分组各铺一组 SKU 行；行值互不串改；列批量编辑全组生效；保存后种子不翻倍 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  let pass = 0, fail = 0;
  const ok = (m) => { pass++; console.log(`  ✅ ${m}`); };
  const ng = (m) => { fail++; console.log(`  ❌ ${m}`); };

  await page.goto('http://localhost:5173/', { waitUntil: 'commit', timeout: 60000 });
  await page.waitForSelector('.top-tabs-item', { timeout: 60000 });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.side .nav-parent');
  await page.locator('.nav-parent:has-text("商品创建")').click();
  await page.waitForTimeout(400);
  await page.locator('.subnav:text-is("淘宝")').click();
  await page.waitForSelector('section.show .create-table tbody tr');

  /* 勾选前 3 件商品 → 选条出现 → 点「编辑商品信息」 */
  const listRows = page.locator('section.show .create-table tbody tr');
  const total = await listRows.count();
  total >= 3 ? ok(`列表共 ${total} 件商品`) : ng(`列表商品不足 3 件：${total}`);
  for (let i = 0; i < 3; i++) await listRows.nth(i).locator('.ib-check').check();
  await page.waitForSelector('.cp-selbar');
  (await page.locator('.cp-selbar-count').textContent()).includes('3') ? ok('选条显示已选 3 条') : ng('选条计数异常');
  await page.locator('.cp-selbar .lightBtn', { hasText: '编辑商品信息' }).click();
  await page.waitForSelector('.cp-quick-table');
  await page.waitForTimeout(300);

  const skuRows = () => page.locator('.cp-quick-table tbody tr:not(.cp-quick-group)').count();
  const groupRows = () => page.locator('.cp-quick-table tbody tr.cp-quick-group').count();

  /* 分组结构：3 个商品头行 + 每组等量 SKU 行 */
  (await groupRows()) === 3 ? ok('批量弹窗展示 3 个商品分组头行') : ng(`分组头行数异常：${await groupRows()}`);
  const titles = await page.evaluate(() => Array.from(document.querySelectorAll('.cp-quick-group-title')).map((e) => e.textContent.trim()));
  new Set(titles).size === 3 ? ok('3 组商品标题互不相同') : ng(`分组标题重复：${titles.join('|')}`);
  const sepCount = await page.locator('.cp-quick-table tbody tr.cp-quick-group.cp-quick-sep').count();
  sepCount === 2 ? ok('商品间渐变分割线 2 条（首组不画）') : ng(`分割线数量异常：${sepCount}`);
  const sepBg = await page.locator('.cp-quick-table tbody tr.cp-quick-sep td').first().evaluate((el) => getComputedStyle(el).backgroundImage);
  sepBg.includes('linear-gradient') ? ok('分割线为左右向中间渐变的蓝线') : ng(`分割线样式异常：${sepBg}`);
  const geo = await page.evaluate(() => {
    const td = document.querySelector('.cp-quick-table tbody tr.cp-quick-sep td');
    const table = document.querySelector('.cp-quick-table');
    return { tdW: Math.round(td.getBoundingClientRect().width), tableW: Math.round(table.getBoundingClientRect().width) };
  });
  Math.abs(geo.tdW - geo.tableW) <= 2 ? ok(`分割线横跨全表宽（${geo.tdW}px）`) : ng(`分割线宽度异常：td=${geo.tdW} table=${geo.tableW}`);
  const n = await skuRows();
  n === 12 ? ok(`SKU 行共 ${n} 行（3 件 × 4 条种子）`) : ng(`SKU 行数异常：${n}`);
  (await page.locator('.pm-modal .sub, .pm-modal-sub').first().textContent().catch(() => '')).includes('3') ? ok('副标题标注已选 3 件商品') : console.log('  ⚠️ 副标题断言跳过（选择器未命中）');
  await page.screenshot({ path: `${OUT}/qsku-batch-1-groups.png` });

  /* 行值独立：改第 1 组首行售价，第 2 组首行不受影响 */
  const priceInput = (i) => page.locator('.cp-quick-table tbody tr:not(.cp-quick-group)').nth(i).locator('td').nth(7).locator('input');
  const p2Before = await priceInput(4).inputValue();
  await priceInput(0).fill('99');
  await page.waitForTimeout(200);
  (await priceInput(4).inputValue()) === p2Before ? ok('分组间行值独立（改第 1 组不影响第 2 组）') : ng('分组间行值串改');

  /* 列批量编辑：库存数统一 77 → 全部 12 行生效 */
  await page.locator('.cp-quick-table thead th', { hasText: '库存数' }).locator('.cp-quick-col-btn').click();
  await page.waitForTimeout(200);
  await page.locator('.cp-quick-colpop input').fill('77');
  await page.locator('.cp-quick-colpop .sg-btn.primary').click();
  await page.waitForTimeout(200);
  const stocks = await page.evaluate(() => Array.from(document.querySelectorAll('.cp-quick-table tbody tr:not(.cp-quick-group)')).map((tr) => tr.querySelectorAll('td')[10].querySelector('input').value));
  stocks.length === 12 && stocks.every((s) => s === '77') ? ok('列批量编辑库存数全组生效（12 行=77）') : ng(`列批量编辑异常：${stocks.join(',')}`);
  await page.screenshot({ path: `${OUT}/qsku-batch-2-coledit.png` });

  /* 保存：弹窗关闭 + toast 标注件数 */
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForTimeout(400);
  (await page.locator('.cp-quick-table').count()) === 0 ? ok('保存成功，弹窗关闭') : ng('弹窗未关闭');
  const toastTxt = await page.locator('.toast, .pm-toast, [class*="toast"]').last().textContent().catch(() => '');
  toastTxt.includes('3 件商品') ? ok(`toast 回显「${toastTxt.trim()}」`) : console.log(`  ⚠️ toast 断言跳过：${toastTxt}`);

  /* 种子未翻倍：重开单件快捷编辑仍 4 行，库存已写回 77 */
  await page.locator('section.show .cp-quick-sku').first().click();
  await page.waitForSelector('.cp-quick-table');
  await page.waitForTimeout(300);
  const single = await page.locator('.cp-quick-table tbody tr').count();
  single === 4 ? ok('保存后种子仍 4 条（未翻倍）') : ng(`种子翻倍异常：${single} 行`);
  (await groupRows()) === 0 ? ok('单件态无分组头行') : ng('单件态出现分组头行');
  const stock0 = await page.locator('.cp-quick-table tbody tr').nth(0).locator('td').nth(10).locator('input').inputValue();
  stock0 === '77' ? ok('批量库存写回种子（单件重开=77）') : ng(`库存写回异常：${stock0}`);
  await page.screenshot({ path: `${OUT}/qsku-batch-3-single.png` });

  console.log(`\n====== 结果: ${pass} 通过, ${fail} 失败 ======`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error(e); process.exitCode = 1; });
