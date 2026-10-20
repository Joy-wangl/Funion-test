/* 验证：店铺商品 评分详情抽屉雷达已回退为三轴（商品分/物流分/服务分），保留放大画布，无图例，悬浮顶点仍出指标明细 */
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
  await page.waitForTimeout(400);
  await clickByText(page, '.qc-side .qc-subnav', '店铺商品');
  await page.waitForSelector('.qc-sg-table tbody tr, table tbody tr');
  await page.waitForTimeout(400);
  const r = {};

  const innerVals = await page.evaluate(() =>
    [...document.querySelectorAll('.qc-sg-inner')].slice(0, 5).map((e) => e.textContent.trim()),
  );
  console.log('innerVals:', innerVals.join(' | '));
  r['list.innerVals'] = innerVals.length > 0 && innerVals.every((v) => /^\d+(\.\d)?$/.test(v));

  const opened = await page.evaluate(() => {
    const links = [...document.querySelectorAll('td a, .qc-op-col a')].filter((a) => a.textContent.trim() === '详情');
    if (!links.length) return 'miss';
    links[0].click();
    return 'ok';
  });
  console.log('open:', opened);
  await page.waitForSelector('.qc-sg-score-drawer');
  await page.waitForTimeout(400);

  const st = await page.evaluate(() => {
    const drawer = document.querySelector('.qc-sg-score-drawer');
    const svg = drawer.querySelector('.qc-sg-radar-svg');
    const box = svg.getBoundingClientRect();
    const dot = drawer.querySelector('.qc-sg-dot');
    return {
      drawerW: Math.round(drawer.getBoundingClientRect().width),
      svgW: Math.round(box.width),
      svgH: Math.round(box.height),
      axes: drawer.querySelectorAll('.qc-sg-axlb').length,
      dots: drawer.querySelectorAll('.qc-sg-dot').length,
      dotFill: getComputedStyle(dot).fill,
      labels: [...drawer.querySelectorAll('.qc-sg-axlb')].map((t) => t.textContent.trim()),
      vals: [...drawer.querySelectorAll('.qc-sg-axval')].map((t) => t.textContent.trim()),
      legend: drawer.querySelectorAll('.qc-sg-radar-legend').length,
      polyPts: (drawer.querySelector('.qc-sg-poly').getAttribute('points') || '').split(' ').length,
    };
  });
  console.log(JSON.stringify(st, null, 1));
  r['drawer.wider'] = st.drawerW >= 660;
  r['radar.bigger'] = st.svgW >= 600 && st.svgH >= 480;
  r['radar.threeAxes'] = st.axes === 3 && st.dots === 3 && st.polyPts === 3;
  r['radar.dimLabels'] = st.labels.join(',') === '商品分,物流分,服务分';
  r['radar.dimVals'] = st.vals.every((v) => /^\d+(\.\d)?$/.test(v));
  r['radar.singleColor'] = st.dotFill === 'rgb(79, 124, 255)';
  r['legend.removed'] = st.legend === 0;

  /* 悬浮扇区出明细：服务轴扇区、商品轴扇区、离开雷达区隐藏；明细卡不压轴标签 */
  const box = await page.evaluate(() => {
    const b = document.querySelector('.qc-sg-radar').getBoundingClientRect();
    return { x: b.x, y: b.y };
  });
  const tipAt = async (px, py) => {
    await page.mouse.move(box.x + px, box.y + py, { steps: 4 });
    await page.waitForTimeout(200);
    return page.evaluate(() => {
      const t = document.querySelector('.qc-sg-score-drawer .qc-sg-radtip');
      if (!t) return { text: '', rect: null };
      const r = t.getBoundingClientRect();
      return { text: t.textContent.trim(), rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
    });
  };
  const tipServ = await tipAt(406, 302);
  console.log('tipServ:', tipServ.text);
  r['tip.sectorServ'] = tipServ.text.includes('会话服务类问题占比') && tipServ.text.includes('得分');
  const tipProd = await tipAt(320, 160);
  console.log('tipProd:', tipProd.text);
  r['tip.sectorProd'] = tipProd.text.includes('商品差评率');
  /* 明细卡与三个轴标签/分值不重叠 */
  const overlap = await page.evaluate(() => {
    const t = document.querySelector('.qc-sg-score-drawer .qc-sg-radtip');
    if (!t) return 'notip';
    const a = t.getBoundingClientRect();
    const hit = [...document.querySelectorAll('.qc-sg-score-drawer .qc-sg-axlb, .qc-sg-score-drawer .qc-sg-axval')]
      .some((el) => { const b = el.getBoundingClientRect(); return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top); });
    return hit ? 'overlap' : 'clear';
  });
  console.log('overlap:', overlap);
  r['tip.noCoverLabels'] = overlap === 'clear';
  await page.mouse.move(box.x + 20, box.y + 20, { steps: 4 });
  await page.waitForTimeout(200);
  const gone = await page.evaluate(() => !document.querySelector('.qc-sg-score-drawer .qc-sg-radtip'));
  r['tip.hideOutside'] = gone;
  await tipAt(406, 302);

  /* 关联数据展开区：收起仅入口钮；展开后下划线 tab 切换售后/评价/聊天会话三组数据卡 */
  r['rel.collapsedFirst'] = await page.evaluate(() => {
    const d = document.querySelector('.qc-sg-score-drawer');
    return !!d.querySelector('.qc-sg-rel-toggle') && !d.querySelector('.qc-sg-rel-tabs');
  });
  await page.evaluate(() => document.querySelector('.qc-sg-score-drawer .qc-sg-rel-toggle').click());
  await page.waitForTimeout(250);
  const rel1 = await page.evaluate(() => {
    const d = document.querySelector('.qc-sg-score-drawer');
    return {
      tabs: [...d.querySelectorAll('.qc-sg-rel-tabs button')].map((b) => b.textContent.trim()),
      active: d.querySelector('.qc-sg-rel-tabs button.active')?.textContent.trim(),
      cards: [...d.querySelectorAll('.qc-sg-rel-card > span')].map((s) => s.textContent.trim()),
      rate: d.querySelector('.qc-sg-rel-rate')?.textContent.trim() || '',
    };
  });
  console.log('rel1:', JSON.stringify(rel1));
  r['rel.tabsThree'] = rel1.tabs.join(',') === '售后数据,评价数据,聊天会话数据' && rel1.active === '售后数据';
  r['rel.afterCards'] = rel1.cards.join(',') === '订单数,售后单数' && rel1.rate.includes('售后占比');
  await clickByText(page, '.qc-sg-score-drawer .qc-sg-rel-tabs button', '评价数据');
  await page.waitForTimeout(200);
  const rel2 = await page.evaluate(() => [...document.querySelectorAll('.qc-sg-score-drawer .qc-sg-rel-card > span')].map((s) => s.textContent.trim()));
  console.log('rel2:', rel2.join(','));
  r['rel.reviewCards'] = rel2.join(',') === '评价数,差评数';
  await clickByText(page, '.qc-sg-score-drawer .qc-sg-rel-tabs button', '聊天会话数据');
  await page.waitForTimeout(200);
  const rel3 = await page.evaluate(() => {
    const d = document.querySelector('.qc-sg-score-drawer');
    return {
      cards: [...d.querySelectorAll('.qc-sg-rel-card > span')].map((s) => s.textContent.trim()),
      rate: d.querySelector('.qc-sg-rel-rate')?.textContent.trim() || '',
    };
  });
  console.log('rel3:', JSON.stringify(rel3));
  r['rel.sessionCards'] = rel3.cards.join(',') === '会话数,风险会话' && rel3.rate.includes('风险占比');
  await page.mouse.move(10, 10);
  await page.waitForTimeout(200);

  await page.screenshot({ path: 'D:/PM.funion/screenshots/sg-radar-revert.png' });
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
