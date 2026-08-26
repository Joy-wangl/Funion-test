/* 临时验证：内部商机/运营管理表格删除「上架店铺」「库存数」两列 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

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
  results['om.fields9'] = (await page.locator('.om-col-item').count()) === 9;

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
