/* 验证：店铺商品列表已还原（保留「商品策略」列、无「预警原因」列——预警列表在异常编码预警路由） */
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
  await page.click('.nav-text:has-text("店铺商品")');
  await page.waitForSelector('.sg-page:visible .sg-table');

  /* 表头：保留「商品策略」（商品状态之后），「预警」列位于 商品策略 与 发布信息 之间（商品数据列已按图删除） */
  const heads = await page.locator('.sg-page:visible .sg-table thead th').allTextContents();
  const iStatus = heads.findIndex((t) => t.includes('商品状态'));
  const iStrategy = heads.findIndex((t) => t.includes('商品策略'));
  results['sgw.strategyColBack'] = iStatus !== -1 && iStrategy === iStatus + 1;
  const iWarn = heads.findIndex((t) => t.includes('预警'));
  const iPub = heads.findIndex((t) => t.includes('发布信息'));
  results['sgw.warnColPos'] = iStrategy !== -1 && iWarn === iStrategy + 1 && iPub === iWarn + 1;
  /* 行内容：策略列正常渲染 */
  const row = page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776666' });
  results['sgw.strategyCell'] = ((await row.locator('td').nth(4).textContent()) || '').trim() === '未关联';

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
