/* 临时验证：商机中心-竞价商品 路由 + 筛选 + 11 列列表 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');

  /* 路由：子导航存在且可切换 */
  results['nav.item'] = (await page.locator('.subnav:has-text("竞价商品")').count()) === 1;
  await page.click('.subnav:has-text("竞价商品")');
  await page.waitForSelector('.ops-center .page.show .bd-table');
  results['nav.active'] = (await page.locator('.subnav.active:has-text("竞价商品")').count()) === 1;

  /* 筛选区字段齐全 */
  const filters = page.locator('.ops-center .page.show .ib-filters');
  for (const f of ['商品名称', '商品ID', '商品编码', '是否有货', '招募状态', '门槛价', '预估利润', '导入时间']) {
    results[`filter.${f}`] = (await filters.locator(`label:has-text("${f}")`).count()) === 1;
  }
  results['filter.btns'] = (await filters.locator('button:has-text("重置")').count()) === 1
    && (await filters.locator('button:has-text("查询")').count()) === 1;

  /* 表头 11 列且顺序正确 */
  const heads = (await page.locator('.ops-center .page.show .bd-table thead th').allTextContents()).map((h) => h.replace(/[⇅▲▼]/g, '').trim());
  results['th.cols'] = heads.join(',') === '商品图片,商品名称,招募状态,必报SKU,门槛价,是否有货,商品编码,预估利润,导入时间,操作';

  /* 行内容：7 行、有货/缺货徽标、编码标签、详情 */
  const body = page.locator('.ops-center .page.show .bd-table tbody');
  results['rows.7'] = (await body.locator('tr').count()) === 7;
  results['rows.badges'] = (await body.locator('.badge-green:has-text("有货")').count()) === 5
    && (await body.locator('.badge-red:has-text("缺货")').count()) === 2;
  results['rows.codeTag'] = (await body.locator('tr td:nth-child(7) .badge-gray').count()) === 7;
  results['rows.statusBadges'] = (await body.locator('.badge-green:has-text("报名中")').count()) === 3
    && (await body.locator('.badge-orange:has-text("待开始")').count()) === 2
    && (await body.locator('.badge-gray:has-text("报名待开启")').count()) === 2;
  results['rows.pidInName'] = (await body.locator('td:has(a.bd-name) .ib-meta').count()) === 7;
  results['rows.nameLink'] = (await body.locator('a.bd-name[href^="http"]').count()) === 7;
  results['rows.noLinkCol'] = (await body.locator('a.bd-link').count()) === 0;
  results['rows.detail'] = (await body.locator('a:has-text("详情")').count()) === 7;
  await page.screenshot({ path: `${OUT}/ops-verify-bidding.png` });

  /* 筛选功能：是否有货=缺货 → 2 行；重置恢复 7 行 */
  await filters.locator('.bselect:has-text("全部")').first().click();
  await page.click('.bselect-opt:has-text("缺货")');
  await filters.locator('button:has-text("查询")').click();
  results['filter.stockOut'] = (await body.locator('tr').count()) === 2;
  await filters.locator('button:has-text("重置")').click();
  results['filter.reset'] = (await body.locator('tr').count()) === 7;

  /* 名称搜索 */
  await filters.locator('input[placeholder="请输入商品名称"]').fill('面霜');
  await filters.locator('button:has-text("查询")').click();
  results['filter.name'] = (await body.locator('tr').count()) === 1;

  /* 排序：门槛价升/降、预估利润升序 */
  await filters.locator('button:has-text("重置")').click();
  const thTh = page.locator('.ops-center .page.show .bd-table thead th:has-text("门槛价")');
  const thPf = page.locator('.ops-center .page.show .bd-table thead th:has-text("预估利润")');
  const cell = (n) => body.locator(`tr td:nth-child(${n})`).first().textContent();
  await thTh.click();
  results['sort.thAsc'] = ((await cell(5)) || '').includes('3.90');
  await thTh.click();
  results['sort.thDesc'] = ((await cell(5)) || '').includes('22.00');
  await thPf.click();
  results['sort.pfAsc'] = ((await cell(8)) || '').includes('1.20');

  /* 招募状态筛选：报名中 → 3 行；重置恢复 */
  await filters.locator('.ib-field:has(label:has-text("招募状态")) .bselect').click();
  await page.click('.bselect-opt:has-text("报名中")');
  await filters.locator('button:has-text("查询")').click();
  results['filter.status3'] = (await body.locator('tr').count()) === 3;
  await filters.locator('button:has-text("重置")').click();

  /* 详情：复用商品创建淘宝详情页 + 返回 */
  await body.locator('a:has-text("详情")').first().click();
  await page.waitForSelector('.sgd-top-title');
  results['detail.page'] = ((await page.locator('.sgd-top-title').textContent()) || '').includes('商品详情');
  results['detail.title'] = ((await page.locator('.sgd-info h2').textContent()) || '').includes('密封胶泥');
  await page.click('.sgd-back');
  results['detail.back'] = (await page.locator('.ops-center .page.show .bd-table').count()) === 1;

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
