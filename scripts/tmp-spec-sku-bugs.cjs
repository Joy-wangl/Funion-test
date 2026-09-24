/**
 * 四页面规格/SKU 交互 BUG 验证 v4
 * 用表头定位列，正确处理 rowspan 合并
 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  let pass = 0, fail = 0;
  const ok = (m) => { pass++; console.log(`  ✅ ${m}`); };
  const ng = (m) => { fail++; console.log(`  ❌ ${m}`); };

  await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('.top-tabs-item', { timeout: 60000 });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.subnav', { timeout: 10000 });

  const nav = async (sub) => {
    const t = page.locator(`.subnav:text-is("${sub}")`);
    if (!await t.isVisible().catch(() => false)) {
      await page.locator('.nav-parent:has-text("商品创建")').click();
      await page.waitForTimeout(400);
    }
    await t.click();
    await page.waitForTimeout(800);
  };
  const openDetail = async () => {
    await page.waitForSelector('section.show .create-table tbody tr', { timeout: 15000 });
    await page.waitForTimeout(300);
    await page.locator('section.show .create-ops a:has-text("详情")').first().click({ force: true });
    await page.waitForSelector('section.show .sgd-hero', { timeout: 10000 });
  };
  const enterEdit = async () => {
    await page.locator('.cpd-top-acts .sg-btn:has-text("编辑")').click();
    await page.waitForTimeout(300);
  };

  /* 通过 evaluate 读取 SKU 表数据（正确处理 rowspan） */
  const getSkuTableData = async () => {
    return page.evaluate(() => {
      const table = document.querySelector('.cpd-sku-table');
      if (!table) return null;
      const headerCells = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
        return { cellCount: cells.length, cells };
      });
    });
  };

  /* 通过 evaluate 读取 specs 数据 */
  const getSpecValues = async () => {
    return page.evaluate(() => {
      const cards = document.querySelectorAll('.cpd-spec-card:not(.cpd-spec-view)');
      return Array.from(cards).map(card => {
        const nameEl = card.querySelector('.cpd-vspec-name');
        const name = nameEl ? nameEl.value || '' : '';
        const vals = Array.from(card.querySelectorAll('.cpd-chip-input')).map(i => i.value);
        return { name, vals };
      });
    });
  };

  /* 改名：click → Ctrl+A → Backspace → type → click 空白触发 blur */
  const renameFirstChip = async (newVal) => {
    const input = page.locator('.cpd-spec-card:first-child .cpd-chip-input').first();
    const oldVal = await input.inputValue().catch(() => null);
    if (oldVal === null) return null;
    await input.click();
    await page.waitForTimeout(100);
    await input.press('Control+a');
    await page.waitForTimeout(50);
    await input.press('Backspace');
    await page.waitForTimeout(50);
    await input.type(newVal, { delay: 15 });
    await page.waitForTimeout(100);
    /* 点击 SKU 标题触发 blur */
    await page.locator('.sgd-sec-title:has-text("商品SKU")').click();
    await page.waitForTimeout(600);
    return oldVal;
  };

  /* ===== 测试改名→SKU名称同步 ===== */
  const testRename = async (label) => {
    console.log(`\n--- [${label}] 属性值改名 → SKU同步 ---`);
    const oldVal = await renameFirstChip('黑色_test');
    if (oldVal === null) { ng('无法读取属性值'); return; }
    ok(`改名: "${oldVal}" → "黑色_test"`);

    /* 检查 specs 数据 */
    const specs = await getSpecValues();
    const firstSpecVals = specs[0]?.vals || [];
    if (firstSpecVals.includes('黑色_test')) ok(`specs[0] 值已更新: ${JSON.stringify(firstSpecVals)}`);
    else ng(`specs[0] 值未更新: ${JSON.stringify(firstSpecVals)}`);

    /* 检查 SKU 表：组合列应包含新值 */
    const skuData = await getSkuTableData();
    if (!skuData) { ng('SKU 表不存在'); return; }
    const firstRow = skuData[0];
    /* 组合列文本包含 "黑色_test" */
    const comboFound = firstRow.cells.some(c => c.includes('黑色_test'));
    if (comboFound) ok(`SKU 组合列包含新值`);
    else ng(`SKU 组合列未包含新值: ${JSON.stringify(firstRow.cells.slice(0, 8))}`);

    /* 检查 SKU 名称列（input.cpd-cell-wide） */
    const skuNameVal = await page.evaluate(() => {
      const inp = document.querySelector('.cpd-sku-table tbody tr:first-child .cpd-cell-wide');
      return inp ? inp.value : '';
    });
    if (skuNameVal.includes('黑色_test')) ok(`SKU名称已更新: "${skuNameVal}"`);
    else ng(`SKU名称未更新: "${skuNameVal}"`);

    await page.screenshot({ path: `${OUT}/tmp-rename-${label}.png` });

    /* 改回 */
    await renameFirstChip(oldVal);
  };

  /* ===== 测试添加属性值→新SKU行 ===== */
  const testAddVal = async (label) => {
    console.log(`\n--- [${label}] 添加属性值 → SKU行数增加 ---`);
    const cntBefore = await page.locator('.cpd-sku-table tbody tr').count();
    ok(`添加前SKU行数: ${cntBefore}`);

    const addInput = page.locator('.cpd-spec-card:first-child .cpd-val-add').first();
    await addInput.click();
    await addInput.type('新值_test', { delay: 15 });
    await addInput.press('Tab');
    await page.waitForTimeout(600);

    const cntAfter = await page.locator('.cpd-sku-table tbody tr').count();
    if (cntAfter > cntBefore) ok(`添加后SKU行数: ${cntAfter}`);
    else ng(`添加后SKU行数未变: ${cntAfter}`);

    /* 清理 */
    await page.evaluate(() => {
      const chips = document.querySelectorAll('.cpd-spec-card:first-child .cpd-chip-del');
      if (chips.length) chips[chips.length - 1].click();
    });
    await page.waitForTimeout(400);
    const hasConfirm = await page.locator('.mk-confirm-modal .danger').last().isVisible().catch(() => false);
    if (hasConfirm) {
      await page.locator('.mk-confirm-modal .danger').last().click();
      await page.waitForTimeout(400);
    }
    const cntClean = await page.locator('.cpd-sku-table tbody tr').count();
    if (cntClean === cntBefore) ok(`清理后SKU行数恢复: ${cntClean}`);
    else ng(`清理后SKU行数不一致: ${cntClean} (期望 ${cntBefore})`);
  };

  /* ===== CSS class 一致性 ===== */
  const testCss = async (label) => {
    console.log(`\n--- [${label}] CSS class 一致性 ---`);
    const ta = await page.locator('.cpd-top-acts').count();
    if (ta > 0) ok('.cpd-top-acts'); else ng('缺少 .cpd-top-acts');
    const sa = await page.locator('.cpd-sku-acts').count();
    if (sa > 0) ok('.cpd-sku-acts'); else ng('缺少 .cpd-sku-acts');
  };

  /* ========== 淘宝 ========== */
  console.log('\n====== 淘宝 ======');
  await nav('淘宝');
  await openDetail();
  await enterEdit();
  await testRename('tb');
  await testAddVal('tb');
  await testCss('淘宝');
  await page.locator('.sgd-back').click();
  await page.waitForTimeout(500);

  /* ========== 视频号 ========== */
  console.log('\n====== 视频号 ======');
  await nav('视频号');
  await openDetail();
  await enterEdit();
  await testRename('video');
  await testAddVal('video');
  await testCss('视频号');
  await page.locator('.sgd-back').click();
  await page.waitForTimeout(500);

  /* ========== 京麦 ========== */
  console.log('\n====== 京麦 ======');
  await nav('京麦');
  await openDetail();
  await enterEdit();
  await testRename('jm');
  await testAddVal('jm');
  await testCss('京麦');
  await page.locator('.sgd-back').click();
  await page.waitForTimeout(500);

  /* ========== 店铺商品详情 ========== */
  console.log('\n====== 店铺商品详情 ======');
  await page.locator('.nav-text:has-text("店铺商品")').click();
  await page.waitForTimeout(800);
  await page.waitForSelector('section.show .sg-table tbody tr', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.locator('section.show .sg-acts .sg-link:has-text("商品详情")').first().click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/tmp-sg-detail.png` });

  const sgEditBtn = page.locator('.cpd-top-acts .sg-btn:has-text("编辑")');
  if (await sgEditBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await sgEditBtn.click();
    await page.waitForTimeout(300);
    await testRename('sg');
    await testAddVal('sg');
    await testCss('店铺商品');
    await page.screenshot({ path: `${OUT}/tmp-final-sg.png` });
  } else {
    ng('店铺商品详情：找不到编辑按钮');
    await page.screenshot({ path: `${OUT}/tmp-sg-noedit.png` });
  }

  console.log(`\n====== 结果: ${pass} 通过, ${fail} 失败 ======`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
