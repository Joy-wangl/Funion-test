/* 临时验证：商品创建-淘宝 关联发布任务抽屉（列表信息 + 失败重试 + 时间排序） */
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

  /* 更多菜单：关联发布任务在列 */
  await page.locator('.create-ops a:has-text("更多")').first().click();
  await page.waitForSelector('.add-pop');
  const menuTexts = await page.locator('.add-pop .add-pop-item').allTextContents();
  results['menu.items'] = menuTexts.join(',') === '关联发布任务,复制,删除';

  /* 点击关联发布任务：右侧抽屉打开，标题带商品名 */
  await page.click('.add-pop .add-pop-item:has-text("关联发布任务")');
  await page.waitForSelector('.cp-drawer');
  results['drawer.open'] = (await page.locator('.cp-drawer').count()) === 1;
  results['drawer.title'] = ((await page.locator('.cp-drawer-head span').textContent()) || '').includes('玫瑰小众轻奢复古耳钉');

  /* 表头九列与截图一致 */
  const headTexts = await page.locator('.cp-drawer thead th').allTextContents();
  const expectHead = ['商品信息', '任务状态', '店铺', '创建人', '执行起止时间 ⇅', '操作'];
  results['drawer.head'] = headTexts.length === 6 && expectHead.every((h, i) => headTexts[i].replace(/\s+/g, ' ').trim() === h);

  /* 行数据：6 条记录，含节点状态与平台店铺 */
  const trs = page.locator('.cp-drawer tbody tr');
  results['drawer.rows'] = (await trs.count()) === 6;
  const firstText = ((await trs.first().textContent()) || '').replace(/\s+/g, '');
  results['drawer.cells'] =
    firstText.includes('玫瑰小众轻奢复古耳钉') &&
    firstText.includes('小二的店铺') &&
    !firstText.includes('获取链接信息') &&
    !firstText.includes('快速铺货') &&
    !firstText.includes('淘宝') &&
    !firstText.includes('智能') &&
    firstText.includes('起：');
  results['drawer.retry'] = (await page.locator('.cp-drawer .tc-link:has-text("重试")').count()) === 2;
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'd:/Qoder/Funion/vue-verify-cplink.png' });

  /* 执行起止时间排序：点击表头切换升降序 */
  const startCell = async (t) => ((((await t.textContent()) || '').match(/起：([^止]+)/) || [])[1] || '').trim();
  const before = await startCell(trs.first());
  await page.locator('.cp-drawer .cp-sort-th').click();
  await page.waitForTimeout(200);
  const after = await startCell(trs.first());
  results['sort.toggle'] = before !== after;

  /* 失败重试：点击后进入重新发布，稍后变为已完成 */
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
