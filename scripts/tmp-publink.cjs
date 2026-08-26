/* 临时验证：关联发布任务抽屉与任务中心同源联动 + 任务ID列 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');

  /* 个人商品库-淘宝，打开「法式复古」行的关联发布任务抽屉 */
  await page.click('.ops-center .nav-parent:has-text("个人商品库")');
  await page.click('.ops-center .subnav:has-text("淘宝")');
  await page.waitForSelector('.create-page');
  const row2 = page.locator('.ops-center .page.show tbody tr', { hasText: '法式复古' });
  await row2.locator('a:has-text("更多")').click();
  await page.click('.add-pop-item:has-text("关联发布任务")');
  await page.waitForSelector('.cp-drawer');

  /* 抽屉任务ID：000200-000205 */
  const ids = await page.locator('.cp-drawer tbody tr td:nth-child(2)').allTextContents();
  results['drawer.ids'] = ids.join(',') === '000200,000201,000202,000203,000204,000205';

  /* 抽屉重试 000201：失败→完成 */
  const d201 = page.locator('.cp-drawer tbody tr', { hasText: '000201' });
  results['drawer.201.failed'] = (await d201.locator('.tc-st.failed').count()) === 1;
  await d201.locator('a.tc-link').click();
  await page.waitForTimeout(1600);
  results['drawer.201.done'] = (await d201.locator('.tc-st.done').count()) === 1;

  /* 任务中心-按任务详情：任务ID列 + 000201 已同步完成 */
  await page.click('.cp-drawer-head button[title="关闭"]');
  await page.click('.ops-center .side .nav:has-text("任务中心")');
  await page.waitForSelector('.tc-page');
  await page.click('.tc-mode button:has-text("按任务详情")');
  await page.waitForSelector('.tc-table.tc-detail');
  results['flat.idCol'] = (await page.locator('.tc-table.tc-detail thead th', { hasText: '任务ID' }).count()) === 1;
  const f201 = page.locator('.tc-table.tc-detail tbody tr', { hasText: '000201' });
  results['flat.201.synced'] = (await f201.locator('.tc-st.done').count()) === 1;

  /* 反向：任务列表重试 000204 → 抽屉同步 */
  const f204 = page.locator('.tc-table.tc-detail tbody tr', { hasText: '000204' });
  await f204.locator('a.tc-link').click();
  await page.waitForTimeout(1600);
  results['flat.204.done'] = (await f204.locator('.tc-st.done').count()) === 1;

  /* 批次列表：发布批次聚合已同步（成功6/失败0），详情含任务ID列 */
  await page.click('.tc-mode button:has-text("按任务批次")');
  await page.waitForSelector('.tc-table.tc-list');
  const batch = page.locator('.tc-table.tc-list tbody tr', { hasText: '2026-08-13 18:24:02' });
  results['batch.agg'] = (await batch.locator('td', { hasText: '任务成功：6' }).count()) === 1
    && (await batch.locator('td', { hasText: '任务失败：0' }).count()) === 1;
  await batch.locator('a.tc-link').click();
  await page.waitForSelector('.tc-table.tc-detail');
  results['detail.idCol'] = (await page.locator('.tc-table.tc-detail thead th', { hasText: '任务ID' }).count()) === 1;
  const b201 = page.locator('.tc-table.tc-detail tbody tr', { hasText: '000201' });
  results['detail.201.done'] = (await b201.count()) === 1 && (await b201.locator('.tc-dash').count()) === 1;

  /* 回抽屉确认 000204 已同步完成 */
  await page.click('.tc-back');
  await page.click('.ops-center .subnav:has-text("淘宝")');
  await page.waitForSelector('.create-page');
  await row2.locator('a:has-text("更多")').click();
  await page.click('.add-pop-item:has-text("关联发布任务")');
  await page.waitForSelector('.cp-drawer');
  const d204 = page.locator('.cp-drawer tbody tr', { hasText: '000204' });
  results['drawer.204.synced'] = (await d204.locator('.tc-st.done').count()) === 1;
  await page.screenshot({ path: `${OUT}/ops-verify-publink.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
