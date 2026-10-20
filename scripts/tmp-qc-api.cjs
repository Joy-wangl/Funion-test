/* 验证：品控-线上列表读取走模拟接口（console 日志 [品控-mock] GET …），查询期间表体 is-loading、响应后恢复行数据 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

const BASE = 'http://127.0.0.1:5173/';
const clickByText = (page, sel, text) =>
  page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, [sel, text]);
const sideNav = (page, text) =>
  page.evaluate((text) => {
    const els = [...document.querySelectorAll('.qc-side *')].filter((e) => e.children.length === 0 && e.textContent.trim() === text);
    if (!els.length) return 'miss:' + text;
    els[0].click();
    return 'ok';
  }, text);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { const t = m.text(); if (t.includes('[品控-mock]')) logs.push(t); });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(400);
  console.log('nav series:', await sideNav(page, '监控列表'));
  await page.waitForSelector('.qc-center-page table tbody tr');
  await page.waitForTimeout(300);
  const r = {};
  console.log('logs:', logs.join(' || '));
  r['api.bootstrap'] = logs.some((t) => t.includes('/qc/db/bootstrap'));
  r['api.monitorSeries'] = logs.some((t) => t.includes('/qc/monitor/series'));

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.qc-center-page .sg-btn.primary')].find((x) => x.textContent.trim() === '查询');
    b.click();
  });
  await page.waitForSelector('.qc-center-page table.is-loading', { timeout: 3000 });
  r['ui.loadingState'] = true;
  await page.waitForFunction(() => !document.querySelector('.qc-center-page table.is-loading'), { timeout: 3000 });
  await page.waitForSelector('.qc-center-page table tbody tr');
  r['ui.loadingCleared'] = true;
  const n1 = logs.filter((t) => t.includes('/qc/monitor/series')).length;
  r['api.refetchOnQuery'] = n1 >= 2;
  await page.screenshot({ path: 'D:/PM.funion/screenshots/qc-mock-api-monitor.png' });

  console.log('nav goods:', await sideNav(page, '店铺商品'));
  await page.waitForSelector('.qc-sg-table tbody tr');
  await page.waitForTimeout(400);
  r['api.shopGoods'] = logs.some((t) => t.includes('/qc/shop/goods'));

  console.log('nav shops:', await sideNav(page, '店铺列表'));
  await page.waitForSelector('.qc-sl-table tbody tr');
  await page.waitForTimeout(400);
  r['api.shopList'] = logs.some((t) => t.includes('/qc/shop/list'));

  console.log('nav reviews:', await sideNav(page, '评价列表'));
  await page.waitForTimeout(800);
  r['api.reviewList'] = logs.some((t) => t.includes('/qc/review/list'));

  await page.screenshot({ path: 'D:/PM.funion/screenshots/qc-mock-api.png' });
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
