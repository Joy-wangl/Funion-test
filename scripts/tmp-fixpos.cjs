/* 临时验证：竞价商品操作行（快速选品+导出左移）& 内部商机移除快速选品 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');

  /* 内部商机：快速选品已移除 */
  await page.click('.subnav:has-text("内部商机")');
  await page.waitForSelector('.ops-center .page.show .ib-actions');
  results['int.noQuick'] = !((await page.locator('.ops-center .page.show .ib-rightacts').textContent()) || '').includes('快速选品');
  results['int.actsKept'] = ((await page.locator('.ops-center .page.show .ib-rightacts').textContent()) || '').includes('重置')
    && ((await page.locator('.ops-center .page.show .ib-rightacts').textContent()) || '').includes('查询');

  /* 竞价商品：快速选品在最前 + 导出位于重置/查询左侧 */
  await page.click('.subnav:has-text("竞价商品")');
  await page.waitForSelector('.ops-center .page.show .bd-table');
  const acts = page.locator('.ops-center .page.show .ib-rightacts');
  const actsText = ((await acts.textContent()) || '').replace(/\s/g, '');
  results['bid.order'] = /快速选品.*导出.*重置.*查询/.test(actsText);
  results['bid.quickSelect'] = (await acts.locator('.ib-select').count()) === 1;

  /* 导出仍可用：未勾选提示 */
  await acts.locator('button:has-text("导出")').click();
  await page.waitForSelector('.toast');
  results['bid.exportToast'] = ((await page.locator('.toast').last().textContent()) || '').includes('勾选');

  await page.screenshot({ path: 'd:/Qoder/Funion/ops-verify-fixpos.png' });
  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
