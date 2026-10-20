/* 验证：计算说明上移为顶部独立应用（更多气泡内），稽查模型配置侧栏不再挂；实际值可手动输入即时重算 */
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

  /* 1. 顶栏可见区无「计算说明」，更多气泡内有 */
  const visibleHas = await page.evaluate(() => [...document.querySelectorAll('.top-tabs-item .top-tabs-chip-label')].some((e) => e.textContent.trim() === '计算说明'));
  r['top.notInVisible'] = !visibleHas;
  await page.click('.top-tabs-more');
  await page.waitForSelector('.top-tabs-more-pop');
  const popRows = await page.evaluate(() => [...document.querySelectorAll('.top-tabs-pop-row .top-tabs-pop-label')].map((e) => e.textContent.trim()));
  console.log('pop:', JSON.stringify(popRows));
  r['top.inMorePop'] = popRows.includes('计算说明');
  await clickByText(page, '.top-tabs-pop-row', '计算说明');
  await page.waitForTimeout(500);

  /* 2. 独立页渲染：标题=计算说明、无品控侧栏 */
  const st = await page.evaluate(() => ({
    title: (document.querySelector('.qc-title') || {}).textContent,
    side: !!document.querySelector('.qc-side'),
    inputs: document.querySelectorAll('.qc-au-tbl .qc-au-vcell input').length,
    radar: (document.querySelector('.qc-au-radar .sample') || {}).getAttribute?.('points'),
    total: (document.querySelector('.qc-au-totalrow b') || {}).textContent,
  }));
  console.log('standalone:', JSON.stringify(st));
  r['page.title'] = (st.title || '').trim() === '计算说明';
  r['page.noSidebar'] = !st.side;
  r['page.inputs'] = st.inputs === 11;

  /* 3. 品控-线上 稽查模型配置侧栏仅 权重配置/豁免机制 */
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(400);
  const subs = await page.evaluate(() => [...document.querySelectorAll('.qc-side .qc-subnav-wrap .qc-nav-text')].map((e) => e.textContent.trim()));
  console.log('audit subs:', JSON.stringify(subs));
  r['side.calcGone'] = subs.includes('权重配置') && subs.includes('豁免机制') && !subs.includes('计算说明');

  /* 4. 回顶部计算说明：改实际值即时重算 */
  await page.click('.top-tabs-more');
  await page.waitForSelector('.top-tabs-more-pop');
  await clickByText(page, '.top-tabs-pop-row', '计算说明');
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => ({
    score: document.querySelector('.qc-au-tbl tbody tr:not(.qc-au-dimrow) td:nth-child(6) b').textContent.trim(),
    total: document.querySelector('.qc-au-totalrow b').textContent.trim(),
    radar: document.querySelector('.qc-au-radar .sample').getAttribute('points'),
  }));
  await page.evaluate(() => {
    const inp = document.querySelector('.qc-au-tbl .qc-au-vcell input');
    inp.value = '0.5';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    score: document.querySelector('.qc-au-tbl tbody tr:not(.qc-au-dimrow) td:nth-child(6) b').textContent.trim(),
    total: document.querySelector('.qc-au-totalrow b').textContent.trim(),
    radar: document.querySelector('.qc-au-radar .sample').getAttribute('points'),
    dim: document.querySelector('.qc-au-dimrow .qc-au-dimrow-sub b').textContent.trim(),
  }));
  console.log('before:', JSON.stringify(before), 'after:', JSON.stringify(after));
  r['edit.scoreInstant'] = before.score !== after.score && after.score === '100';
  r['edit.totalInstant'] = before.total !== after.total;
  r['edit.radarInstant'] = before.radar !== after.radar;

  await page.screenshot({ path: 'D:/PM.funion/screenshots/audit-calc-top.png', fullPage: true });
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
