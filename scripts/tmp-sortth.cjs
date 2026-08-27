/* 临时验证：全局排序表头统一为 SortTh 组件（品控/聚合接待/实时接待/商品创建抽屉） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');

  const results = {};
  const fills = (loc) => loc.locator('svg path').evaluateAll((ps) => ps.map((p) => p.getAttribute('fill')));

  /* 品控中心-监控列表：4 个 SortTh，点击订单量切换高亮 */
  await page.click('.top-tabs-item:has-text("品控中心")');
  await page.waitForSelector('.qc-center-page');
  await page.click('.qc-nav:has-text("监控列表")');
  await page.waitForSelector('.qc-center-page thead .sort-th');
  const qcThs = page.locator('.qc-center-page thead .sort-th');
  results['qc.count4'] = (await qcThs.count()) === 4;
  const qcOrders = page.locator('.qc-center-page thead .sort-th:has-text("订单量")');
  const qcBefore = await fills(qcOrders);
  await qcOrders.click();
  await page.waitForTimeout(200);
  const qcAfter = await fills(qcOrders);
  results['qc.toggle'] = JSON.stringify(qcBefore) !== JSON.stringify(qcAfter);
  results['qc.oldGone'] = (await page.locator('.qc-center-page .th-sort, .qc-center-page .sort-ico').count()) === 0;
  await page.screenshot({ path: `${OUT}/ops-verify-sortth.png` });

  /* 聚合接待-客服子表：11 个 SortTh，点击接待会话数高亮降序 */
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('.rc-page');
  results['rc.count11'] = (await page.locator('.rc-page thead .sort-th').count()) === 11;
  const rcSess = page.locator('.rc-page thead .sort-th:has-text("接待会话数")');
  const rcBefore = await fills(rcSess);
  await rcSess.click();
  await page.waitForTimeout(200);
  const rcAfter = await fills(rcSess);
  results['rc.toggle'] = JSON.stringify(rcBefore) !== JSON.stringify(rcAfter) && rcAfter[1] === 'var(--color-primary)';
  results['rc.oldGone'] = (await page.locator('.rc-th-sort, .rc-sorter, .rc-sort-ico').count()) === 0;

  /* 实时客服接待：3 个 SortTh，点击接待切换 */
  await page.click('.rc-menu-item.child:has-text("实时客服接待")');
  await page.waitForSelector('.rc-live');
  results['live.count3'] = (await page.locator('.rc-live thead').first().locator('.sort-th').count()) === 3;
  const liveRecv = page.locator('.rc-live thead .sort-th:has-text("接待")').first();
  const lvBefore = await fills(liveRecv);
  await liveRecv.click();
  await page.waitForTimeout(200);
  const lvAfter = await fills(liveRecv);
  results['live.toggle'] = JSON.stringify(lvBefore) !== JSON.stringify(lvAfter);

  /* 商品创建-淘宝-关联发布任务抽屉：1 个 SortTh，点击行序变化 */
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');
  await page.click('.nav-parent:has-text("商品创建")');
  await page.waitForTimeout(200);
  await page.click('.subnav:has-text("淘宝")');
  await page.waitForSelector('.create-table tbody tr');
  await page.locator('.create-ops a:has-text("更多")').first().click();
  await page.waitForSelector('.add-pop');
  await page.click('.add-pop .add-pop-item:has-text("关联发布任务")');
  await page.waitForSelector('.cp-drawer');
  results['cp.count1'] = (await page.locator('.cp-drawer thead .sort-th').count()) === 1;
  const trs = page.locator('.cp-drawer tbody tr');
  const startCell = async (t) => ((((await t.textContent()) || '').match(/起：([^止]+)/) || [])[1] || '').trim();
  const cpBefore = await startCell(trs.first());
  await page.locator('.cp-drawer thead .sort-th').click();
  await page.waitForTimeout(200);
  const cpAfter = await startCell(trs.first());
  results['cp.toggle'] = cpBefore !== cpAfter;
  results['cp.oldGone'] = (await page.locator('.cp-sort-th').count()) === 0;

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
