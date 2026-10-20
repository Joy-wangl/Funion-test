/* 验证：店铺列表 店铺体验分保留趋势折线；商品/物流/服务三子维度去趋势改近30天ID问题命中（售后/评价/会话） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

const BASE = 'http://127.0.0.1:5173/';
const clickByText = (page, sel, text) =>
  page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, [sel, text]);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const r = {};
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(400);
  await clickByText(page, '.qc-side .qc-subnav', '店铺列表');
  await page.waitForSelector('.qc-sl-table tbody tr');
  await page.waitForTimeout(400);

  const info = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.qc-sl-table tbody tr')].slice(0, 5);
    return rows.map((tr) => {
      const cells = [...tr.querySelectorAll('td')].slice(2, 6);
      return cells.map((td, i) => ({
        col: i,
        spark: !!td.querySelector('.qc-sl-spark svg polyline'),
        dates: !!td.querySelector('.qc-sl-spark-x'),
        hits: td.querySelector('.qc-sl-hits')
          ? {
            lb: td.querySelector('.qc-sl-hits-lb').textContent.trim(),
            items: [...td.querySelectorAll('.qc-sl-hit')].map((x) => ({
              k: x.querySelector('em').textContent.trim(),
              v: Number(x.querySelector('b').textContent.trim()),
            })),
          }
          : null,
        score: td.querySelector('.qc-sl-score').textContent.trim(),
      }));
    });
  });
  console.log(JSON.stringify(info[0], null, 1));
  r['scoreCol.keepsTrend'] = info.every((row) => row[0].spark && row[0].dates && !row[0].hits);
  r['subCols.noTrend'] = info.every((row) => [1, 2, 3].every((i) => !row[i].spark && !row[i].dates));
  r['subCols.haveHits'] = info.every((row) => [1, 2, 3].every((i) => row[i].hits && row[i].hits.items.length === 3));
  r['hits.labels'] = info.every((row) => [1, 2, 3].every((i) => JSON.stringify(row[i].hits.items.map((x) => x.k)) === JSON.stringify(['售后', '评价', '会话'])));
  r['hits.nonNeg'] = info.every((row) => [1, 2, 3].every((i) => row[i].hits.items.every((x) => Number.isFinite(x.v) && x.v >= 0)));
  /* 量级与体验分负相关：同列内分数越低命中合计越高（取前5行抽样） */
  const corr = [1, 2, 3].map((i) => {
    const pts = info.map((row) => ({ s: Number(row[i].score), t: row[i].hits.items.reduce((a, b) => a + b.v, 0) }));
    const sorted = [...pts].sort((a, b) => a.s - b.s);
    return sorted[0].t >= sorted[sorted.length - 1].t;
  });
  console.log('corr:', JSON.stringify(corr));
  r['hits.inverseToScore'] = corr.every(Boolean);

  await page.screenshot({ path: 'D:/PM.funion/screenshots/shoplist-hits.png' });
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
