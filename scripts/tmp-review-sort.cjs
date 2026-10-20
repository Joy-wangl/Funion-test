/* 验证：品控-线上 监控列表「评价数据」复合列排序（评价数/差评数/差评占比 升降序，与订单/聊天一致） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
const BASE = 'http://127.0.0.1:5173/';

const clickByText = (page, sel, text) =>
  page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, [sel, text]);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const r = {};
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-nav', '监控列表');
  await page.waitForSelector('.qc-center-page thead .sort-th', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);

  /* 评价数据列头是 sort-th（可排序），点击出气泡 */
  const reviewTh = page.locator('.qc-center-page thead .qc-pick-th:has-text("评价数据")');
  r['reviewTh.isSortTh'] = (await reviewTh.locator('.sort-th').count()) > 0 || (await reviewTh.evaluate((e) => e.className)).includes('sort-th');
  await reviewTh.click();
  await page.waitForTimeout(250);
  const menu = page.locator('.qc-center-page .qc-sort-pick-menu');
  r['menu.visible'] = (await menu.count()) > 0;
  const opts = await page.locator('.qc-center-page .qc-sort-pick-opt').allTextContents();
  r['opts'] = opts.map((t) => t.replace(/\s+/g, ''));
  r['has.reviewTotal'] = r['opts'].some((t) => t.includes('评价数'));
  r['has.reviewBad'] = r['opts'].some((t) => t.includes('差评数'));
  r['has.reviewRate'] = r['opts'].some((t) => t.includes('差评占比'));
  await page.screenshot({ path: `${OUT}/review-sort-menu.png` });

  /* 记录排序前首列系列编码顺序 */
  const firstCodes = async () => {
    const rows = page.locator('.qc-center-page tbody tr .qc-series-code, .qc-center-page tbody tr td:nth-child(2)');
    const n = await rows.count();
    const out = [];
    for (let i = 0; i < Math.min(n, 6); i++) out.push(((await rows.nth(i).textContent()) || '').trim().slice(0, 12));
    return out;
  };
  const before = await firstCodes();

  /* 点击「差评占比」行的「降序」（直接点方向 span，其 click.stop 不触发 onPickMetric） */
  await page.locator('.qc-sort-pick-opt:has-text("差评占比") .qc-dir-txt:has-text("降序")').click();
  await page.waitForTimeout(350);
  const afterDesc = await firstCodes();
  r['order.changed'] = JSON.stringify(before) !== JSON.stringify(afterDesc);

  /* 表头图标反映 desc 态 */
  const dirState = await page.locator('.qc-center-page thead .qc-pick-th:has-text("评价数据") svg path').evaluateAll((ps) => ps.map((p) => p.getAttribute('fill')));
  r['header.dirFills'] = dirState;
  await page.screenshot({ path: `${OUT}/review-sort-desc.png` });

  /* 再切「差评占比」升序，顺序应再次变化 */
  await reviewTh.click();
  await page.waitForTimeout(200);
  await page.locator('.qc-sort-pick-opt:has-text("差评占比") .qc-dir-txt:has-text("升序")').click();
  await page.waitForTimeout(350);
  const afterAsc = await firstCodes();
  r['asc.different.from.desc'] = JSON.stringify(afterAsc) !== JSON.stringify(afterDesc);

  console.log('before:', JSON.stringify(before));
  console.log('afterDesc:', JSON.stringify(afterDesc));
  console.log('afterAsc:', JSON.stringify(afterAsc));
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
