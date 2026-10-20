/* 验证：监控列表「命中问题类型」列 按数量降序 + 最多三行 + 超出 +N 悬浮气泡（同上架平台口径） */
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
  await clickByText(page, '.qc-side .qc-subnav', '监控列表');
  await page.waitForSelector('.qc-center-page tbody tr');
  await page.waitForTimeout(500);

  /* 逐行检查类型单元格：行数<=3、数量降序、+N 与气泡 */
  const info = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.qc-center-page tbody tr')].slice(0, 6);
    return rows.map((tr) => {
      const cell = tr.querySelector('.prob-tags');
      if (!cell) return null;
      const chips = [...cell.children].filter((c) => c.classList.contains('tag') && !c.classList.contains('prob-more'));
      const more = cell.querySelector('.hit-more');
      const moreN = more ? parseInt(((more.childNodes[0] && more.childNodes[0].textContent) || '').replace(/[^0-9]/g, ''), 10) || 0 : 0;
      const tops = [...new Set([...cell.children].map((c) => c.offsetTop))].sort((a, b) => a - b);
      const counts = chips.map((c) => parseInt((c.textContent || '').trim().split(/\s+/).pop() || '0', 10));
      const desc = counts.every((v, i) => i === 0 || counts[i - 1] >= v);
      return {
        total: chips.length + moreN,
        shown: chips.length,
        rows: tops.length,
        desc,
        more: more ? `+${moreN}` : null,
      };
    });
  });
  console.log(JSON.stringify(info, null, 1));
  r['rows.max3'] = info.every((x) => !x || x.rows <= 3);
  r['desc.sorted'] = info.every((x) => !x || x.desc);
  r['has.overflow'] = info.some((x) => x && x.more);
  r['more.matches'] = info.every((x) => !x || !x.more || x.shown + parseInt(x.more.replace(/[^0-9]/g, ''), 10) === x.total);

  /* 悬浮 +N：气泡展示剩余芯片 */
  const firstMore = page.locator('.qc-center-page tbody tr .hit-more').first();
  await firstMore.hover();
  await page.waitForTimeout(300);
  const bubble = await page.evaluate(() => {
    const b = document.querySelector('.qc-center-page tbody tr .hit-more:hover .prob-bubble')
      || [...document.querySelectorAll('.qc-center-page tbody tr .hit-more .prob-bubble')].find((x) => getComputedStyle(x).display !== 'none');
    if (!b) return null;
    return { display: getComputedStyle(b).display, chips: b.querySelectorAll('.tag').length };
  });
  console.log('bubble:', JSON.stringify(bubble));
  r['bubble.visible'] = !!bubble && bubble.display === 'flex';
  r['bubble.hasChips'] = !!bubble && bubble.chips > 0;
  await page.screenshot({ path: `${OUT}/hit-types-overflow.png` });

  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
