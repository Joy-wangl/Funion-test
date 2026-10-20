/* 端到端串流程：品控-线上全部侧栏叶子页渲染＋监控列表查询/展开/详情/排序/翻页＋店铺商品查询/详情，捕获 pageerror 与 console error */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

const BASE = 'http://127.0.0.1:5173/';
const errors = [];
const mockLogs = [];

const sideNavN = (page, text, idx = 0) =>
  page.evaluate(([text, idx]) => {
    const els = [...document.querySelectorAll('.qc-side *')].filter((e) => e.children.length === 0 && e.textContent.trim() === text);
    if (!els.length) return 'miss:' + text;
    (els[idx] || els[0]).click();
    return 'ok';
  }, [text, idx]);
const clickText = (page, sel, text) =>
  page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim() === text);
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, [sel, text]);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    const t = m.text();
    if (t.includes('[品控-mock]')) mockLogs.push(t);
    else if (m.type() === 'error') errors.push('CONSOLE: ' + t.slice(0, 200));
  });
  const r = {};
  const contentOk = () => page.evaluate(() => {
    const main = document.querySelector('.qc-center-page') || document.querySelector('.app-content');
    return !!main && main.textContent.trim().length > 200;
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { [...document.querySelectorAll('.top-tabs-item')].find((e) => e.textContent.includes('品控-线上'))?.click(); });
  await page.waitForTimeout(600);

  /* 逐叶子页渲染 */
  const leaves = [
    ['数据概览', 0], ['监控列表', 0], ['数据概览', 1], ['店铺列表', 0], ['店铺商品', 0],
    ['售后列表', 0], ['评价列表', 0], ['命中问题管理', 0], ['问题商品定义', 0],
    ['成员管理', 0], ['部门管理', 0], ['角色管理', 0], ['权重配置', 0], ['豁免机制', 0],
  ];
  for (const [label, idx] of leaves) {
    const nav = await sideNavN(page, label, idx);
    await page.waitForTimeout(700);
    const ok = nav === 'ok' && (await contentOk());
    r['view.' + label + (idx ? '.2' : '')] = ok;
    if (!ok) console.log('VIEW FAIL:', label, idx, nav);
  }

  /* 监控列表交互串 */
  await sideNavN(page, '监控列表', 0);
  await page.waitForSelector('.qc-center-page table tbody tr');
  await clickText(page, '.qc-center-page .sg-btn.primary', '查询');
  await page.waitForSelector('.qc-center-page table.is-loading');
  await page.waitForFunction(() => !document.querySelector('.qc-center-page table.is-loading'));
  r['flow.monitor.query'] = true;
  const firstCode = await page.evaluate(() => document.querySelector('.qc-center-page tbody tr td:nth-child(2)')?.textContent.trim().slice(0, 10));
  await page.evaluate(() => document.querySelector('.qc-center-page tbody tr .arrow')?.click());
  await page.waitForSelector('.qc-center-page tbody tr.expand-row');
  r['flow.monitor.expand'] = true;
  await page.evaluate(() => { [...document.querySelectorAll('.qc-center-page tbody tr a')].find((a) => a.textContent.trim() === '查看详情')?.click(); });
  await page.waitForSelector('.qc-series-drawer');
  const dTitle = await page.evaluate(() => document.querySelector('.qc-series-drawer .d-title')?.textContent.trim());
  r['flow.monitor.detail'] = !!dTitle;
  await page.evaluate(() => document.querySelector('.qc-series-drawer .drawer-head .x')?.click());
  await page.waitForFunction(() => !document.querySelector('.qc-series-drawer'));
  r['flow.monitor.detailClose'] = true;
  /* 排序：订单数据列头气泡 → 降序 */
  await page.evaluate(() => { [...document.querySelectorAll('.qc-center-page th')].find((t) => t.textContent.includes('订单数据'))?.click(); });
  await page.waitForTimeout(300);
  const dirClick = await clickText(page, '.qc-center-page .qc-dir-txt', '降序');
  await page.waitForTimeout(600);
  r['flow.monitor.sort'] = dirClick === 'ok';
  /* 翻页 */
  const pg = await clickText(page, '.qc-center-page .ib-pagination button', '2');
  await page.waitForTimeout(500);
  const firstCode2 = await page.evaluate(() => document.querySelector('.qc-center-page tbody tr td:nth-child(2)')?.textContent.trim().slice(0, 10));
  r['flow.monitor.page'] = pg === 'ok' && firstCode2 !== firstCode;
  await page.screenshot({ path: 'D:/PM.funion/screenshots/qc-e2e-monitor.png' });

  /* 店铺商品交互串 */
  await sideNavN(page, '店铺商品', 0);
  await page.waitForSelector('.qc-sg-table tbody tr');
  await clickText(page, '.qc-center-page .sg-btn.primary', '查询');
  await page.waitForSelector('.qc-center-page table.is-loading');
  await page.waitForFunction(() => !document.querySelector('.qc-center-page table.is-loading'));
  r['flow.goods.query'] = true;
  await page.evaluate(() => { [...document.querySelectorAll('.qc-sg-table tbody tr a')].find((a) => a.textContent.trim() === '详情')?.click(); });
  await page.waitForSelector('.qc-series-drawer');
  const gTitle = await page.evaluate(() => document.querySelector('.qc-series-drawer .d-title')?.textContent.trim());
  r['flow.goods.detail'] = gTitle === '商品详情';
  await page.evaluate(() => document.querySelector('.qc-series-drawer .drawer-head .x')?.click());
  await page.waitForFunction(() => !document.querySelector('.qc-series-drawer'));
  r['flow.goods.detailClose'] = true;

  /* 店铺列表 → 店铺商品 跳转带入条件 */
  await sideNavN(page, '店铺列表', 0);
  await page.waitForSelector('.qc-sl-table tbody tr a');
  const jump = await page.evaluate(() => { const a = [...document.querySelectorAll('.qc-sl-table tbody tr a')].find((a) => a.textContent.trim() === '店铺商品'); if (!a) return 'miss'; a.click(); return 'ok'; });
  await page.waitForSelector('.qc-sg-table tbody tr', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  const goodsRows = await page.evaluate(() => document.querySelectorAll('.qc-sg-table tbody tr').length);
  r['flow.shopJump.goods'] = jump === 'ok' && goodsRows > 0;

  /* 监控列表 关联ID → 店铺商品 带编码 */
  await sideNavN(page, '监控列表', 0);
  await page.waitForSelector('.qc-center-page table tbody tr');
  await page.evaluate(() => { [...document.querySelectorAll('.qc-center-page tbody tr a')].find((a) => a.textContent.trim() === '关联ID')?.click(); });
  await page.waitForTimeout(800);
  const goodsRows2 = await page.evaluate(() => document.querySelectorAll('.qc-sg-table tbody tr').length);
  r['flow.codesJump.goods'] = goodsRows2 > 0;

  /* 计算说明 顶层应用 */
  await page.evaluate(() => { [...document.querySelectorAll('.top-tabs-item')].find((e) => e.textContent.includes('计算说明'))?.click(); });
  await page.waitForTimeout(600);
  r['view.auditCalc'] = await contentOk();

  console.log('mockPaths:', [...new Set(mockLogs.map((t) => (t.match(/GET \S+/) || [''])[0]))].join(', '));
  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
  if (errors.length) console.log('ERRORS PRESENT');
})();
