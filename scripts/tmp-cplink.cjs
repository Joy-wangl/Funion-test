/* 临时验证：关联发布任务抽屉（摘要区上提 + 查询条件 + 排序 + 失败重试） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ops-center .side');

  const results = {};

  /* 进入商品创建-淘宝 */
  await page.click('.nav-parent:has-text("商品创建")');
  await page.waitForTimeout(200);
  await page.click('.subnav:has-text("淘宝")');
  await page.waitForSelector('.create-table tbody tr');

  /* 更多菜单 */
  await page.locator('.create-ops a:has-text("更多")').first().click();
  await page.waitForSelector('.add-pop');
  const menuTexts = await page.locator('.add-pop .add-pop-item').allTextContents();
  results['menu.items'] = menuTexts.join(',') === '关联发布任务,复制,删除';

  /* 打开抽屉：标题仅保留功能名 */
  await page.click('.add-pop .add-pop-item:has-text("关联发布任务")');
  await page.waitForSelector('.cp-drawer');
  const headTitle = ((await page.locator('.cp-drawer-head span').textContent()) || '').trim();
  results['drawer.title'] = headTitle === '关联发布任务';

  /* 摘要区：商品+竞品链接+最近更新时间，无店铺/创建人 */
  const sumText = ((await page.locator('.cp-drawer-summary').textContent()) || '').replace(/\s+/g, '');
  results['drawer.summary'] =
    sumText.includes('玫瑰小众轻奢复古耳钉') &&
    sumText.includes('竞品链接') &&
    sumText.includes('最近更新时间') &&
    sumText.includes('2026-04-0412:06:00') &&
    !sumText.includes('小二的店铺') &&
    !sumText.includes('张三');

  /* 表格列：任务ID/任务状态/节点状态/执行起止时间/操作 */
  const headTexts = await page.locator('.cp-drawer thead th').allTextContents();
  const expectHead = ['任务ID', '任务状态', '节点状态', '执行起止时间 ⇅', '操作'];
  results['drawer.head'] = headTexts.length === 5 && expectHead.every((h, i) => headTexts[i].replace(/\s+/g, ' ').trim() === h);
  const bodyText = ((await page.locator('.cp-drawer tbody').textContent()) || '').replace(/\s+/g, '');
  results['drawer.nodeSteps'] = bodyText.includes('获取链接信息') && bodyText.includes('商品发布店铺');
  results['drawer.noConstCols'] = !bodyText.includes('小二的店铺') && !bodyText.includes('张三') && !bodyText.includes('竞品链接');
  results['drawer.taskId'] = bodyText.includes('000100') && bodyText.includes('000105');

  const trs = page.locator('.cp-drawer tbody tr');
  results['drawer.rows'] = (await trs.count()) === 6;
  results['drawer.retry'] = (await page.locator('.cp-drawer .tc-link:has-text("重试")').count()) === 2;
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'd:/Qoder/Funion/vue-verify-cplink.png' });

  /* 执行起止时间排序 */
  const startCell = async (t) => ((((await t.textContent()) || '').match(/起：([^止]+)/) || [])[1] || '').trim();
  const before = await startCell(trs.first());
  await page.locator('.cp-drawer .cp-sort-th').click();
  await page.waitForTimeout(200);
  const after = await startCell(trs.first());
  results['sort.toggle'] = before !== after;

  /* 任务状态 tab 切换：执行失败 → 2 行；全部 → 6 行 */
  results['tabs.count'] = (await page.locator('.cp-drawer-filter .tc-tab').count()) === 5;
  await page.locator('.cp-drawer-filter .tc-tab', { hasText: '执行失败' }).click();
  await page.waitForTimeout(200);
  results['tabs.failed'] = (await trs.count()) === 2;
  await page.locator('.cp-drawer-filter .tc-tab', { hasText: '全部' }).click();
  await page.waitForTimeout(200);
  results['tabs.all'] = (await trs.count()) === 6;

  /* 执行时间查询：起始改 04-05 → 0 行；重置恢复 6 行 */
  await page.locator('.cp-drawer-filter .ib-range input').first().fill('2026-04-05');
  await page.click('.cp-drawer-filter button:has-text("查询")');
  await page.waitForTimeout(200);
  results['filter.time'] = (await trs.count()) === 0;
  await page.click('.cp-drawer-filter button:has-text("重置")');
  await page.waitForTimeout(200);
  results['filter.reset'] = (await trs.count()) === 6;

  /* 失败重试：重新发布中 → 已完成 */
  await page.locator('.cp-drawer .tc-link:has-text("重试")').first().click();
  await page.waitForTimeout(300);
  results['retry.toasting'] = (await page.locator(':text("重新发布中")').count()) >= 1;
  await page.waitForTimeout(1500);
  results['retry.done'] = (await page.locator('.cp-drawer .tc-link:has-text("重试")').count()) === 1;
  results['retry.toast'] = (await page.locator(':text("重新发布成功")').count()) >= 1;

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'CPLINK VERIFY OK' : `CPLINK VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
