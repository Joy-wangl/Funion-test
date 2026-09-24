/* 临时验证：三个路由（淘宝/视频号/京麦）+ 店铺商品详情 规格/SKU 交互一致性 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};

  await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('.top-tabs-item', { timeout: 60000 });

  /* 导航到智能运营中心 */
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.subnav', { timeout: 10000 });

  /* ========== 辅助函数 ========== */
  const navigateToCreate = async (routeName) => {
    const target = page.locator(`.subnav:text-is("${routeName}")`);
    const isVisible = await target.isVisible().catch(() => false);
    if (!isVisible) {
      await page.locator('.nav-parent:has-text("商品创建")').click();
      await page.waitForTimeout(400);
    }
    await target.click();
    await page.waitForTimeout(800);
  };

  const openCreateDetail = async () => {
    await page.waitForSelector('section.show .create-table tbody tr', { timeout: 15000 });
    await page.waitForTimeout(500);
    const detailLink = page.locator('section.show .create-ops a:has-text("详情")').first();
    await detailLink.click({ force: true });
    await page.waitForSelector('section.show .sgd-hero', { timeout: 10000 });
  };

  const enterEdit = async () => {
    await page.locator('.cpd-top-acts .sg-btn:has-text("编辑")').click();
    await page.waitForTimeout(300);
  };

  /* ========== 淘宝路由 ========== */
  await navigateToCreate('淘宝');
  results['tb_listLoaded'] = await page.locator('.create-table tbody tr').count() > 0;
  await openCreateDetail();
  await enterEdit();

  const tbSpecCards = page.locator('.cpd-spec-card:not(.cpd-spec-view)');
  results['tb_specCards'] = await tbSpecCards.count() >= 2;
  results['tb_dragHandles'] = await tbSpecCards.locator('.cpd-drag[title="拖动排序规格"]').count() >= 2;
  results['tb_valGrips'] = await page.locator('.cpd-tchip .cpd-chip-grip').count() > 0;
  results['tb_valInputs'] = await page.locator('.cpd-tchip .cpd-chip-input').count() > 0;
  results['tb_valDelBtns'] = await page.locator('.cpd-tchip .cpd-chip-del').count() > 0;
  results['tb_specDelBtns'] = await page.locator('.cpd-spec-card:not(.cpd-spec-view) .cpd-spec-ics .danger').count() >= 2;
  results['tb_addSpecBtn'] = await page.locator('.cpd-add-spec:has-text("添加规格")').count() > 0;
  results['tb_skuTable'] = await page.locator('.cpd-sku-table.cpd-tsku').count() > 0;
  results['tb_skuMerge'] = await page.locator('.cpd-merge-cell').count() > 0;
  results['tb_skuOps'] = await page.locator('.cpd-row-ops a.danger:has-text("删除")').count() > 0;
  results['tb_skuSort'] = await page.locator('.cpd-tsku thead th:has-text("排序")').count() > 0;
  results['tb_skuImg'] = await page.locator('.cpd-tsku thead th:has-text("SKU图")').count() > 0;

  await page.screenshot({ path: `${OUT}/tmp-spec-tb.png` });
  await page.locator('.sgd-back').click();
  await page.waitForTimeout(500);

  /* ========== 视频号路由 ========== */
  await navigateToCreate('视频号');
  results['video_listLoaded'] = await page.locator('.create-table tbody tr').count() > 0;
  await openCreateDetail();
  await enterEdit();

  const videoSpecCards = page.locator('.cpd-spec-card:not(.cpd-spec-view)');
  results['video_specCards'] = await videoSpecCards.count() >= 2;
  results['video_dragHandles'] = await videoSpecCards.locator('.cpd-drag[title="拖动排序规格"]').count() >= 2;
  results['video_valGrips'] = await page.locator('.cpd-tchip .cpd-chip-grip').count() > 0;
  results['video_valInputs'] = await page.locator('.cpd-tchip .cpd-chip-input').count() > 0;
  results['video_valDelBtns'] = await page.locator('.cpd-tchip .cpd-chip-del').count() > 0;
  results['video_skuTable'] = await page.locator('.cpd-sku-table.cpd-tsku').count() > 0;
  results['video_skuMerge'] = await page.locator('.cpd-merge-cell').count() > 0;
  results['video_skuOps'] = await page.locator('.cpd-row-ops a.danger:has-text("删除")').count() > 0;

  await page.screenshot({ path: `${OUT}/tmp-spec-video.png` });
  await page.locator('.sgd-back').click();
  await page.waitForTimeout(500);

  /* ========== 京麦路由 ========== */
  await navigateToCreate('京麦');
  results['jm_listLoaded'] = await page.locator('.create-table tbody tr').count() > 0;
  await openCreateDetail();
  await enterEdit();

  const jmSpecCards = page.locator('.cpd-spec-card:not(.cpd-spec-view)');
  results['jm_specCards'] = await jmSpecCards.count() >= 2;
  results['jm_dragHandles'] = await jmSpecCards.locator('.cpd-drag[title="拖动排序规格"]').count() >= 2;
  results['jm_valGrips'] = await page.locator('.cpd-tchip .cpd-chip-grip').count() > 0;
  results['jm_valInputs'] = await page.locator('.cpd-tchip .cpd-chip-input').count() > 0;
  results['jm_valDelBtns'] = await page.locator('.cpd-tchip .cpd-chip-del').count() > 0;
  results['jm_specDelBtns'] = await page.locator('.cpd-spec-card:not(.cpd-spec-view) .cpd-spec-ics .danger').count() >= 2;
  results['jm_addSpecBtn'] = await page.locator('.cpd-add-spec:has-text("添加规格")').count() > 0;
  results['jm_skuTable'] = await page.locator('.cpd-sku-table.cpd-tsku').count() > 0;
  results['jm_skuMerge'] = await page.locator('.cpd-merge-cell').count() > 0;
  results['jm_skuOps'] = await page.locator('.cpd-row-ops a.danger:has-text("删除")').count() > 0;
  results['jm_jdPrice'] = await page.locator('.cpd-tsku thead th:has-text("京东价")').count() > 0;
  results['jm_upc'] = await page.locator('.cpd-tsku thead th:has-text("条码")').count() > 0;
  results['jm_status'] = await page.locator('.cpd-tsku thead th:has-text("状态")').count() > 0;

  await page.screenshot({ path: `${OUT}/tmp-spec-jm.png` });
  await page.locator('.sgd-back').click();
  await page.waitForTimeout(500);

  /* ========== 店铺商品详情 ========== */
  /* 导航到店铺商品（直接点击 nav，非 nav-parent） */
  await page.locator('.nav-text:has-text("店铺商品")').click();
  await page.waitForTimeout(800);

  /* 等待列表加载 */
  await page.waitForSelector('section.show .sg-table tbody tr', { timeout: 15000 });
  await page.waitForTimeout(500);
  results['sg_listLoaded'] = await page.locator('section.show .sg-table tbody tr').count() > 0;

  /* 点击「商品详情」进入详情 */
  const sgDetailLink = page.locator('section.show .sg-acts .sg-link:has-text("商品详情")').first();
  await sgDetailLink.click({ force: true });
  await page.waitForTimeout(1000);

  /* 点击编辑按钮进入编辑态 */
  await page.locator('.cpd-top-acts .sg-btn:has-text("编辑")').click();
  await page.waitForTimeout(300);

  /* 店铺商品详情：规格卡存在 */
  const sgSpecCards = page.locator('section.show .cpd-spec-card:not(.cpd-spec-view)');
  results['sg_specCards'] = await sgSpecCards.count() >= 2;
  /* 店铺商品详情：规格卡有拖拽把手 */
  results['sg_dragHandles'] = await sgSpecCards.locator('.cpd-drag[title="拖动排序规格"]').count() >= 2;
  /* 店铺商品详情：属性值有拖拽把手 */
  results['sg_valGrips'] = await page.locator('section.show .cpd-tchip .cpd-chip-grip').count() > 0;
  /* 店铺商品详情：属性值有改名输入框 */
  results['sg_valInputs'] = await page.locator('section.show .cpd-tchip .cpd-chip-input').count() > 0;
  /* 店铺商品详情：属性值有删除按钮 */
  results['sg_valDelBtns'] = await page.locator('section.show .cpd-tchip .cpd-chip-del').count() > 0;
  /* 店铺商品详情：规格有删除按钮 */
  results['sg_specDelBtns'] = await page.locator('section.show .cpd-spec-card:not(.cpd-spec-view) .cpd-spec-ics .danger').count() >= 2;
  /* 店铺商品详情：添加规格按钮 */
  results['sg_addSpecBtn'] = await page.locator('section.show .cpd-add-spec:has-text("添加规格")').count() > 0;
  /* 店铺商品详情：SKU 表存在 */
  results['sg_skuTable'] = await page.locator('section.show .cpd-sku-table.cpd-tsku').count() > 0;
  /* 店铺商品详情：SKU 表有合并列 */
  results['sg_skuMerge'] = await page.locator('section.show .cpd-merge-cell').count() > 0;
  /* 店铺商品详情：SKU 表有操作列 */
  results['sg_skuOps'] = await page.locator('section.show .cpd-row-ops a.danger:has-text("删除")').count() > 0;

  await page.screenshot({ path: `${OUT}/tmp-spec-sg.png` });

  console.log(JSON.stringify(results, null, 2));
  const fail = Object.entries(results).filter(([, v]) => v !== true);
  console.log(fail.length ? `FAIL ${fail.length}: ${fail.map(([k]) => k).join(',')}` : 'ALL PASS');
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
