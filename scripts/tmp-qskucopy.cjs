/* 快捷编辑SKU·属性值下沉验证 v5：顶部属性模块移除＋SKU 表下拉内改名/删除属性值（二次确认联动删行）＋复制副本闭环 */
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
  await page.locator('section.show .cp-quick-sku').first().click();
  await page.waitForSelector('.cp-quick-table');
  await page.waitForTimeout(300);

  const rows = () => page.locator('.cp-quick-table tbody tr').count();
  const styleCell = (i) => page.locator('.cp-quick-table tbody tr').nth(i).locator('td').nth(2);
  const openStyle = async (i) => { await styleCell(i).locator('.bselect-trigger').click(); await page.waitForTimeout(250); };
  const opt = (txt) => page.locator('.bselect-menu .bselect-opt', { hasText: txt });

  /* 顶部属性配置模块不再展示；属性维度列仍在 */
  (await page.locator('.cp-quick-specs').count()) === 0 ? ok('顶部属性配置模块已移除') : ng('顶部属性模块仍存在');
  (await page.locator('.cp-quick-table thead th', { hasText: '颜色分类' }).count()) === 1 ? ok('属性维度列保留') : ng('属性维度列缺失');
  await page.screenshot({ path: `${OUT}/qsku-copy-1-open.png` });

  /* 改名：下拉内铅笔 → 行内输入 → 确认；所有含该值的行同步 */
  await openStyle(0);
  (await opt('a款').locator('.bselect-rename').count()) === 1 ? ok('下拉选项 hover 出改名铅笔') : ng('缺少改名铅笔');
  await opt('a款').hover();
  await opt('a款').locator('.bselect-rename').click();
  await page.waitForTimeout(200);
  await page.locator('.bselect-rename-form input').fill('a款改');
  await page.locator('.bselect-rename-form button').click();
  await page.waitForTimeout(300);
  await page.locator('.cp-quick-table thead th').first().click();
  await page.waitForTimeout(200);
  const renamed = await page.evaluate(() => Array.from(document.querySelectorAll('.cp-quick-table tbody tr')).map((tr) => tr.querySelectorAll('td')[2].textContent.trim()));
  renamed.filter((t) => t.includes('a款改')).length === 2 ? ok(`改名同步 2 行（${renamed.join('|')}）`) : ng(`改名同步异常：${renamed.join('|')}`);
  await page.screenshot({ path: `${OUT}/qsku-copy-2-renamed.png` });

  /* 删除：下拉内垃圾桶 → 二次确认（指明联动行数）→ 联动删行 */
  await openStyle(0);
  await opt('b款').hover();
  (await opt('b款').locator('.bselect-del').count()) === 1 ? ok('下拉选项 hover 出删除垃圾桶') : ng('缺少删除垃圾桶');
  await opt('b款').locator('.bselect-del').click();
  await page.waitForTimeout(300);
  (await page.locator('.mk-confirm-modal').count()) === 1 ? ok('删除属性值弹二次确认') : ng('缺少二次确认');
  (await page.getByText(/删除「b款」将同时删除 2 个关联 SKU 行/).count()) > 0 ? ok('确认文案指明联动行数') : ng('确认文案异常');
  await page.screenshot({ path: `${OUT}/qsku-copy-3-delconfirm.png` });
  const before = await rows();
  await page.locator('.mk-confirm-foot .sg-btn.danger').click();
  await page.waitForTimeout(300);
  (await rows()) === before - 2 ? ok(`联动删除 2 行（${before}→${await rows()}）`) : ng(`联动删行异常：${before}→${await rows()}`);
  const left = await page.evaluate(() => Array.from(document.querySelectorAll('.cp-quick-table tbody tr')).map((tr) => tr.querySelectorAll('td')[2].textContent.trim()));
  left.every((t) => !t.includes('b款')) ? ok('剩余行不含已删属性值') : ng(`剩余行仍含 b款：${left.join('|')}`);
  await page.screenshot({ path: `${OUT}/qsku-copy-4-deleted.png` });

  /* 复制副本闭环仍可用：气泡勾选 1 个属性 → 副本值落行 */
  const n1 = await rows();
  await page.locator('.cp-quick-table tbody tr').nth(0).locator('.cp-quick-op').first().click();
  await page.waitForTimeout(250);
  await page.locator('.cp-quick-copypop .cp-quick-poprow').nth(0).locator('.cp-quick-popchip').click();
  await page.locator('.cp-quick-copypop .sg-btn.primary').click();
  await page.waitForTimeout(300);
  (await rows()) === n1 + 1 ? ok('复制副本落行（+1）') : ng(`复制落行异常：${await rows()}`);
  const color0 = await page.locator('.cp-quick-table tbody tr').nth(1).locator('td').nth(1).textContent();
  (color0 || '').includes('黑色副本') ? ok('副本值「黑色副本」落行') : ng(`副本值异常：${color0}`);
  await page.screenshot({ path: `${OUT}/qsku-copy-5-copied.png` });

  /* 保存成功弹窗关闭 */
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForTimeout(400);
  (await page.locator('.cp-quick-table').count()) === 0 ? ok('保存成功，弹窗关闭') : ng('弹窗未关闭');
  await page.screenshot({ path: `${OUT}/qsku-copy-6-saved.png` });

  console.log(`\n====== 结果: ${pass} 通过, ${fail} 失败 ======`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error(e); process.exitCode = 1; });
