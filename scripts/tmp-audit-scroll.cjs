/* 验证：品控-线上 侧边栏滚动条已隐藏（保留滚动交互），权重配置页布局不变 */
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
  const page = await browser.newPage({ viewport: { width: 1600, height: 760 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(300);
  /* 展开全部父级分组，让侧栏内容溢出产生滚动需求 */
  await page.evaluate(() => {
    document.querySelectorAll('.qc-side .qc-nav-parent').forEach((p) => {
      if (!p.classList.contains('child') && !p.querySelector('.qc-nav-arrow.open')) p.click();
    });
  });
  await page.waitForTimeout(300);
  await clickByText(page, '.qc-side .qc-nav', '稽查模型配置');
  await page.waitForTimeout(300);
  await clickByText(page, '.qc-side .qc-subnav', '权重配置');
  await page.waitForTimeout(400);

  const r = {};
  const m = await page.evaluate(() => {
    const side = document.querySelector('.qc-side');
    const cs = getComputedStyle(side);
    return {
      overflows: side.scrollHeight > side.clientHeight + 2,
      strip: side.offsetWidth - side.clientWidth - parseFloat(cs.borderRightWidth || '0'),
      overflowY: cs.overflowY,
      scrollbarWidth: cs.scrollbarWidth,
      webkitBar: getComputedStyle(side, '::-webkit-scrollbar').display,
      title: document.querySelector('.qc-title') ? document.querySelector('.qc-title').textContent.trim() : '',
      sideBox: (() => { const b = side.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.width)]; })(),
    };
  });
  console.log(JSON.stringify(m, null, 1));
  r['side.overflows'] = m.overflows; /* 前提：侧栏确有滚动需求 */
  r['side.noStrip'] = m.strip === 0; /* 无滚动条占位 */
  r['side.scrollKept'] = m.overflowY === 'auto';
  r['side.barHidden'] = m.scrollbarWidth === 'none';
  r['page.isWeight'] = m.title.includes('权重配置');

  /* 滚动交互仍可用：滚到底再回顶 */
  const scrolled = await page.evaluate(async () => {
    const side = document.querySelector('.qc-side');
    side.scrollTop = side.scrollHeight;
    await new Promise((res) => setTimeout(res, 120));
    const bottom = side.scrollTop > 0;
    side.scrollTop = 0;
    return bottom;
  });
  r['side.canScroll'] = scrolled;

  await page.screenshot({ path: 'D:/PM.funion/screenshots/audit-weight-noscroll.png' });
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
