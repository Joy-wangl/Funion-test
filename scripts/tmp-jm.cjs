/* 验证：京麦（京东 POP）平台——商品创建列表/详情 + 店铺商品 Tab/详情（字段映射京麦开放平台商品API） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');

  /* ===== 1. 商品创建 / 京麦：导航子项 + 列表 ===== */
  await page.click('.nav-text:has-text("商品创建")');
  await page.click('.subnav:has-text("京麦")');
  await page.waitForSelector('.page.show .create-table');
  const badges = page.locator('.page.show .create-platform-badge.jm');
  results['jm.createRows'] = (await badges.count()) === 4
    && ((await badges.first().textContent()) || '').trim() === '京麦';
  const stores = await page.locator('.page.show .create-table tbody tr').count();
  results['jm.createList'] = stores === 4;
  await page.screenshot({ path: `${OUT}/ops-jm-create-list.png` });

  /* ===== 2. 商品创建 / 京麦详情：接口字段还原 ===== */
  await page.click('.page.show .create-table tbody tr:first-child .create-ops a:has-text("详情")');
  await page.waitForSelector('.jm-detail:visible');
  const dTxt = ((await page.locator('.jm-detail:visible').textContent()) || '').replace(/\s/g, '');
  results['jm.platTag'] = ((await page.locator('.jm-detail:visible .jm-plat-tag').textContent()) || '').trim() === '京麦';
  results['jm.detailSecs'] = ['商品规格', '商品SKU', '主图（方图）', '长图', '商品详情（PC端）', '商品详情（APP端）', '白底图', '透明图', '场景图', '商品视频', '其它信息']
    .every((t) => dTxt.includes(t));
  const skuThs = ((await page.locator('.jm-detail:visible .jm-sku-table thead').textContent()) || '').replace(/\s/g, '');
  results['jm.skuCols'] = ['SKU图', 'SKU名称', '销售属性', '京东价', '市场价', '库存', '商品编码'].every((t) => skuThs.includes(t));
  results['jm.skuRows'] = (await page.locator('.jm-detail:visible .jm-sku-table tbody tr').count()) === 4
    && dTxt.includes('¥39.90') && dTxt.includes('JM-2201-B');
  await page.screenshot({ path: `${OUT}/ops-jm-create-detail.png` });
  /* 素材区目视：滚到白底图/场景图段 */
  await page.locator('.jm-detail:visible .sgd-sec', { hasText: '白底图' }).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ops-jm-detail-materials.png` });
  await page.click('.jm-detail:visible .sgd-back');
  await page.waitForSelector('.page.show .create-table');

  /* ===== 3. 店铺商品 / 京麦：Tab + 列表 ===== */
  await page.click('.nav-text:has-text("店铺商品")');
  await page.waitForSelector('.sg-page:visible .sg-filter');
  const tabs = ((await page.locator('.sg-page:visible .sg-tabs').textContent()) || '');
  results['jm.sgTab'] = tabs.includes('京麦');
  await page.click('.sg-page:visible .sg-tab:has-text("京麦")');
  await page.waitForTimeout(200);
  const sgRows = page.locator('.sg-page:visible .sg-table tbody tr');
  results['jm.sgRows'] = (await sgRows.count()) === 5
    && (((await sgRows.first().textContent()) || '').includes('京东Funion旗舰店'));
  await page.screenshot({ path: `${OUT}/ops-jm-shopgoods-list.png` });

  /* ===== 4. 店铺商品 / 京麦详情：主图、SKU、详情图、白底图、场景图 ===== */
  await page.click('.sg-page:visible .sg-table tbody tr:first-child .sg-acts a:has-text("商品详情")');
  await page.waitForSelector('.jm-detail:visible');
  const sTxt = ((await page.locator('.jm-detail:visible').textContent()) || '').replace(/\s/g, '');
  results['jm.sgDetail'] = ['商品SKU', '主图（方图）', '商品详情（PC端）', '白底图', '场景图'].every((t) => sTxt.includes(t))
    && (await page.locator('.jm-detail:visible .jm-sku-table tbody tr').count()) === 4;
  await page.screenshot({ path: `${OUT}/ops-jm-shopgoods-detail.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  Object.entries(results).forEach(([k, v]) => console.log(`${v ? 'PASS' : 'FAIL'}  ${k}`));
  console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS');
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
