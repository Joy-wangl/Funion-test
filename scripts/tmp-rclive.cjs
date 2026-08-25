/* 临时验证：实时客服接待样式重构—视觉升级且功能不变 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('.rc-page');
  await page.click('.rc-menu-item.child:has-text("实时客服接待")');
  await page.waitForSelector('.rc-live');

  const results = {};

  /* 样式：tab 主色 / 同区单主按钮 / 店铺卡阴影 / 账号卡悬浮 */
  const tabBg = await page.locator('.rc-live-tab.cur').evaluate((el) => getComputedStyle(el).backgroundColor);
  results['style.tabPrimary'] = tabBg === 'rgb(79, 124, 255)';
  results['style.singlePrimary'] =
    (await page.locator('.rc-live-actions .btn.primary').count()) === 1 &&
    (await page.locator('.rc-live-actions .btn:not(.primary):has-text("拉取全部未回复")').count()) === 1;
  const storeShadow = await page.locator('.rc-store').first().evaluate((el) => getComputedStyle(el).boxShadow);
  results['style.storeShadow'] = storeShadow !== 'none';
  const acc = page.locator('.rc-acc-table tbody tr').first();
  const before = await acc.evaluate((el) => getComputedStyle(el).backgroundColor);
  await acc.hover();
  await page.waitForTimeout(250);
  const after = await acc.evaluate((el) => getComputedStyle(el).backgroundColor);
  results['style.accHover'] = before !== after;

  /* 布局：顶栏含 tab+统计 / 店铺流单列 / 未回复行浅红底 */
  results['ux.topbarStats'] =
    (await page.locator('.rc-live-top .rc-live-tab').count()) >= 8 &&
    (await page.locator('.rc-live-top .rc-live-stat').count()) >= 6;
  const s0 = await page.locator('.rc-store').nth(0).boundingBox();
  const s1 = await page.locator('.rc-store').nth(1).boundingBox();
  results['ux.storeFeedSingleCol'] = !!s0 && !!s1 && Math.abs(s0.x - s1.x) <= 1 && s1.y > s0.y + s0.height - 4;
  const alertBg = await page.locator('.rc-acc-table tbody tr.alert').first().evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => '');
  results['ux.alertAccent'] = alertBg !== '' && alertBg !== 'rgba(0, 0, 0, 0)' && alertBg !== 'rgb(255, 255, 255)';

  /* 布局：表格化—7 列表头浅底 / 状态圆点 / 数字加粗 */
  const thInfo = await page.locator('.rc-acc-table thead th').first().evaluate((el) => `${el.closest('table').querySelectorAll('thead th').length}|${getComputedStyle(el).backgroundColor}`);
  results['ux.tableHead'] = thInfo.startsWith('7|') && !thInfo.endsWith('rgba(0, 0, 0, 0)');
  results['ux.netDots'] = (await page.locator('.rc-acc-table .rc-net').count()) >= 2;
  results['ux.noOfflineText'] = (await page.locator('.rc-acc-table :text("离线")').count()) === 0;
  const numWeight = await page.locator('.rc-td-num b').first().evaluate((el) => getComputedStyle(el).fontWeight);
  results['ux.numbersAnchor'] = numWeight === '700';

  /* 功能不变：平台切换 / 开关 / 查看更多 / 拉取未回复 */
  await page.click('.rc-live-tab:has-text("抖音")');
  await page.waitForTimeout(150);
  results['func.platformSwitch'] = (await page.locator('.rc-live-tab.cur:has-text("抖音")').count()) === 1;
  await page.click('.rc-live-tab:has-text("拼多多")');
  await page.waitForTimeout(150);
  const sw = page.locator('.rc-acc-table .rc-switch').first();
  const swOn = await sw.evaluate((el) => el.classList.contains('on'));
  await sw.click();
  results['func.switchToggle'] = (await sw.evaluate((el) => el.classList.contains('on'))) !== swOn;
  results['func.pullVisible'] = (await page.locator('.rc-pull:has-text("拉取")').count()) >= 1;
  const more = page.locator('.rc-more').first();
  if ((await more.count()) > 0) {
    const n0 = await page.locator('.rc-store').first().locator('.rc-acc-table tbody tr').count();
    await more.click();
    await page.waitForTimeout(150);
    const n1 = await page.locator('.rc-store').first().locator('.rc-acc-table tbody tr').count();
    results['func.moreExpand'] = n1 > n0;
  } else {
    results['func.moreExpand'] = true;
  }

  /* 排序：三列 sorter / 未回复 降序 → 升序 → 取消还原 */
  const firstTable = page.locator('.rc-store').first();
  results['sort.three'] = (await firstTable.locator('thead th.rc-th-sort').count()) === 3;
  const thUn = firstTable.locator('thead th', { hasText: '未回复' });
  const colVals = () => firstTable.locator('.rc-acc-table tbody tr').evaluateAll((trs) => trs.map((tr) => Number(tr.children[3].textContent)));
  const rowIds = () => firstTable.locator('.rc-acc-table tbody tr').evaluateAll((trs) => trs.map((tr) => tr.querySelector('.rc-acc-id').textContent));
  const origIds = await rowIds();
  await thUn.click();
  await page.waitForTimeout(150);
  let sv = await colVals();
  results['sort.descFirst'] = (await thUn.evaluate((el) => el.classList.contains('desc'))) && sv[0] === 1 && sv.every((n, i) => i === 0 || sv[i - 1] >= n);
  await thUn.click();
  await page.waitForTimeout(150);
  sv = await colVals();
  results['sort.ascNext'] = (await thUn.evaluate((el) => el.classList.contains('asc'))) && sv.every((n, i) => i === 0 || sv[i - 1] <= n);
  await thUn.click();
  await page.waitForTimeout(150);
  const thCls = await thUn.evaluate((el) => el.className);
  results['sort.reset'] = !thCls.includes('asc') && !thCls.includes('desc') && JSON.stringify(await rowIds()) === JSON.stringify(origIds);

  /* 视图层：分段切换 + 顶栏联动 + 零命中隐藏 */
  results['view.seg'] = (await page.locator('.rc-viewseg button').count()) === 4;
  await page.click('.rc-viewseg button:has-text("仅异常")');
  await page.waitForTimeout(150);
  const alertRows = await page.locator('.rc-acc-table tbody tr').count();
  const alertHit = await page.locator('.rc-acc-table tbody tr.alert').count();
  results['view.alertFilter'] = alertRows >= 1 && alertRows === alertHit;
  results['view.hideZeroHit'] = (await page.locator('.rc-store').count()) === 1;
  await page.screenshot({ path: `${OUT}/rc-live-alertview.png` });
  /* 顶栏未回复点击联动分段器 */
  await page.click('.rc-viewseg button:has-text("全部")');
  await page.waitForTimeout(100);
  await page.click('.rc-live-stat.click >> nth=1');
  await page.waitForTimeout(150);
  results['view.statLink'] = (await page.locator('.rc-viewseg button.on:has-text("仅异常")').count()) === 1;
  /* 在线视图：每行 PC 圆点亮 */
  await page.click('.rc-viewseg button:has-text("仅在线")');
  await page.waitForTimeout(150);
  const onRows = await page.locator('.rc-acc-table tbody tr').count();
  const onPc = await page.locator('.rc-acc-table tbody tr .rc-td-net .rc-net:first-child.on').count();
  results['view.onlineFilter'] = onRows >= 1 && onPc === onRows;
  /* 离线视图：无行 PC 圆点亮 */
  await page.click('.rc-viewseg button:has-text("仅离线")');
  await page.waitForTimeout(150);
  const offRows = await page.locator('.rc-acc-table tbody tr').count();
  const offPc = await page.locator('.rc-acc-table tbody tr .rc-td-net .rc-net:first-child.on').count();
  results['view.offlineFilter'] = offRows >= 1 && offPc === 0;
  /* 还原全部视图 */
  await page.click('.rc-viewseg button:has-text("全部")');
  await page.waitForTimeout(150);

  await page.screenshot({ path: `${OUT}/rc-live-refactor.png`, fullPage: false });
  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'RCLIVE VERIFY OK' : `RCLIVE VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
