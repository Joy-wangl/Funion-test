/* 临时验证：内部商机/运营管理表格删除「上架店铺」「库存数」两列 */
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

  /* 内部商机 */
  const grp = page.locator('.nav-parent:has-text("商机中心")');
  if (!(await grp.getAttribute('class')).includes('open')) await grp.click();
  await page.click('.subnav:has-text("内部商机")');
  await page.waitForSelector('.ops-center .page.show tbody tr');
  const thead = page.locator('.ops-center .page.show thead');
  results['ib.noStore'] = (await thead.locator('th:has-text("上架店铺")').count()) === 0;
  results['ib.noStock'] = (await thead.locator('th:has-text("库存数")').count()) === 0;
  results['ib.th13'] = (await thead.locator('th').count()) === 13;
  results['ib.tdAlign'] = await page.evaluate(() => {
    const tr = document.querySelector('.ops-center .page.show tbody tr');
    return tr ? tr.children.length === 13 : false;
  });
  await page.screenshot({ path: `${OUT}/ops-verify-cols.png` });

  /* 运营管理：列管理气泡不再含两列 */
  await page.click('.nav-text:has-text("运营管理")');
  await page.waitForSelector('.om-page');
  await page.click('button[title="管理列表字段"]');
  await page.waitForSelector('.om-col-pop');
  results['om.noStore'] = (await page.locator('.om-col-pop:has-text("上架店铺")').count()) === 0;
  results['om.noStock'] = (await page.locator('.om-col-pop:has-text("库存数")').count()) === 0;
  results['om.fields36'] = (await page.locator('.om-col-item').count()) === 36;
  /* 排序图标常显（按标注「增加排序图标」） */
  results['om.gripShown'] = await page.evaluate(() => {
    const g = document.querySelector('.om-col-item .om-col-grip');
    return !!g && getComputedStyle(g).opacity === '1';
  });

  /* 字段排序：拖「商品类目」到「昨日销量」→ 列表表头顺序同步（类目落在昨日销量后一位） */
  await page.locator('.om-col-item', { hasText: '商品类目' }).dragTo(page.locator('.om-col-item', { hasText: '昨日销量' }));
  await page.waitForTimeout(250);
  const ths2 = (await page.locator('.om-page .ib-table thead th').allTextContents()).map((t) => t.trim());
  results['om.sortMoved'] = ths2.indexOf('商品类目') === ths2.indexOf('昨日销量') + 1;
  await page.screenshot({ path: `${OUT}/ops-verify-colpop-sort.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
