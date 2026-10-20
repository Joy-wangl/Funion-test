/* 验证：权重配置 删除「平台对标口径」块；三维指标权重改分段胶囊 tab 单组展示 */
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
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(300);
  await clickByText(page, '.qc-side .qc-nav', '稽查模型配置');
  await page.waitForTimeout(300);
  await clickByText(page, '.qc-side .qc-subnav', '权重配置');
  await page.waitForTimeout(400);

  const r = {};
  const snap = () => page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.qc-au-dim-tabs button')];
    const card = document.querySelector('.qc-au-dim-tabs') ? document.querySelector('.qc-au-dim-tabs').closest('.qc-au-card') : null;
    const rows = card ? [...card.querySelectorAll('tbody tr')] : [];
    return {
      platGone: !document.body.textContent.includes('平台对标口径'),
      tabCount: tabs.length,
      tabs: tabs.map((b) => ({ t: b.textContent.trim(), dot: !!b.querySelector('i'), n: b.querySelector('.n') ? b.querySelector('.n').textContent.trim() : '', active: b.classList.contains('active') })),
      oneCard: document.querySelectorAll('.qc-au-dim-tabs').length === 1,
      tableCount: card ? card.querySelectorAll('table.qc-au-tbl').length : 0,
      rows: rows.map((tr) => tr.querySelector('td').textContent.trim()),
      sum: card ? (card.querySelector('.qc-au-sum') || {}).textContent : '',
      sumBad: card ? card.querySelector('.qc-au-sum').classList.contains('bad') : null,
      weights: rows.map((tr) => Number(tr.querySelectorAll('input')[0].value)),
      switches: card ? card.querySelectorAll('.qc-au-switch').length : -1,
      ths: card ? [...card.querySelectorAll('thead th')].map((th) => th.textContent.trim()) : [],
      headKept: !!document.querySelector('.qc-au-card-hd .qc-au-card-t'),
      footKept: !!document.querySelector('.qc-au-foot .sg-btn.primary'),
    };
  });

  const s0 = await snap();
  console.log('default:', JSON.stringify(s0, null, 1));
  r['plat.removed'] = s0.platGone;
  r['tabs.three'] = s0.tabCount === 3 && s0.oneCard;
  r['tabs.dotAndCount'] = s0.tabs.every((t) => t.dot && /^\d+$/.test(t.n));
  r['tabs.defaultGoods'] = s0.tabs[0].active && !s0.tabs[1].active && !s0.tabs[2].active;
  r['single.table'] = s0.tableCount === 1;
  r['sum.matchesRows'] = s0.sum.includes(String(s0.weights.reduce((a, b) => a + b, 0))) && !s0.sumBad;
  r['shell.kept'] = s0.headKept && s0.footKept;
  r['enable.colGone'] = s0.switches === 0 && s0.ths.length === 6 && !s0.ths.includes('启用');

  await clickByText(page, '.qc-au-dim-tabs button', '物流分');
  await page.waitForTimeout(250);
  const s1 = await snap();
  console.log('logistics:', JSON.stringify({ rows: s1.rows, sum: s1.sum, active: s1.tabs.map((t) => t.active) }));
  r['tab.switch.logistics'] = s1.tabs[1].active && s1.rows.length > 0 && JSON.stringify(s1.rows) !== JSON.stringify(s0.rows);
  r['tab.switch.singleTable'] = s1.tableCount === 1;
  r['tab.switch.sum'] = s1.sum.includes(String(s1.weights.reduce((a, b) => a + b, 0)));

  await clickByText(page, '.qc-au-dim-tabs button', '服务分');
  await page.waitForTimeout(250);
  const s2 = await snap();
  r['tab.switch.service'] = s2.tabs[2].active && JSON.stringify(s2.rows) !== JSON.stringify(s1.rows);

  /* 当前 tab 内改权重：合计实时重算并标红 */
  await page.evaluate(() => {
    const card = document.querySelector('.qc-au-dim-tabs').closest('.qc-au-card');
    const inp = card.querySelector('tbody tr input');
    inp.value = String(Number(inp.value) + 5);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(250);
  const s3 = await snap();
  console.log('dirty:', JSON.stringify({ sum: s3.sum, bad: s3.sumBad }));
  r['edit.sumRecompute'] = s3.sumBad === true && s3.sum.includes(String(s2.weights.reduce((a, b) => a + b, 0) + 5));
  /* 恢复原值 */
  await page.evaluate(() => {
    const card = document.querySelector('.qc-au-dim-tabs').closest('.qc-au-card');
    const inp = card.querySelector('tbody tr input');
    inp.value = String(Number(inp.value) - 5);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(200);
  const s4 = await snap();
  r['edit.restore'] = s4.sumBad === false;

  /* 回到商品分截图 */
  await clickByText(page, '.qc-au-dim-tabs button', '商品分');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'D:/PM.funion/screenshots/audit-weight-tabs.png', fullPage: true });
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
