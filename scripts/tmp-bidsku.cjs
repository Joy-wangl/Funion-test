/* 临时验证：竞价商品 子表「SKU名称」列 + 部分SKU「必报」标签 */
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
  await page.click('.subnav:has-text("竞价商品")');
  await page.waitForSelector('.ops-center .page.show .bd-table');

  /* 主表表头不再含「必报SKU」列 */
  const heads = (await page.locator('.ops-center .page.show .bd-table thead th').allTextContents()).join(',');
  results['main.noReqCol'] = !heads.includes('必报SKU') && !heads.includes('SKU名称');

  const carets = page.locator('.ops-center .page.show .bd-table tbody .ib-caret');

  /* 展开第 1 个商品：子表表头为 SKU名称…，2 个 SKU 中 1 个带必报标签 */
  await carets.nth(0).click();
  await page.waitForSelector('.ib-subtable');
  const subTh = (await page.locator('.ib-subtable thead th').allTextContents()).join(',');
  results['sub.heads'] = subTh === 'SKU名称,门槛价,是否有货,商品编码,预估利润';
  const sub1 = page.locator('.ib-subtable').first();
  results['sub.rows2'] = (await sub1.locator('tbody tr').count()) === 2;
  results['sub.reqTag1'] = (await sub1.locator('.ib-req-tag:has-text("必报")').count()) === 1;
  results['sub.reqOnFirst'] = ((await sub1.locator('tbody tr').nth(0).textContent()) || '').includes('必报')
    && !((await sub1.locator('tbody tr').nth(1).textContent()) || '').includes('必报');

  /* 展开第 2 个商品：必报在第 2 个 SKU 上 */
  await carets.nth(1).click();
  const sub2 = page.locator('.ib-subtable').nth(1);
  results['sub2.reqTag1'] = (await sub2.locator('.ib-req-tag').count()) === 1;
  results['sub2.reqOnSecond'] = !((await sub2.locator('tbody tr').nth(0).textContent()) || '').includes('必报')
    && ((await sub2.locator('tbody tr').nth(1).textContent()) || '').includes('必报');

  await page.screenshot({ path: `${OUT}/ops-verify-bidsku.png` });
  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
