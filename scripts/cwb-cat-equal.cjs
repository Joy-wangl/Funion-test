/* 校验：大类三等分等长＋子标签与所在列等长＋超长省略＋title 悬浮全名 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'd:/PM/funion/screenshots';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.cwb-cat-tag', { timeout: 20000 });
  await page.waitForTimeout(800);

  const data = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.cwb-cat-item')];
    const rows = {};
    items.forEach((it) => {
      const t = it.getBoundingClientRect().top;
      const key = Math.round(t / 4) * 4;
      (rows[key] = rows[key] || []).push(it);
    });
    const perRow = Object.keys(rows).sort((a, b) => a - b).map((k) =>
      rows[k].map((it) => (it.querySelector('.cwb-cat-name') || {}).textContent || '')
    );
    const catW = items.map((it) => Math.round(it.getBoundingClientRect().width));
    const subW = items.map((it) => [...it.querySelectorAll('.cwb-sub')].map((s) => Math.round(s.getBoundingClientRect().width)));
    const trunc = [];
    items.forEach((it) => {
      const name = it.querySelector('.cwb-cat-name');
      if (name) trunc.push({ kind: 'cat', text: name.textContent, truncated: name.scrollWidth > name.clientWidth, title: (it.querySelector('.cwb-cat-tag') || {}).title });
      it.querySelectorAll('.cwb-sub').forEach((s) => trunc.push({ kind: 'sub', text: s.textContent, truncated: s.scrollWidth > s.clientWidth, title: s.title }));
    });
    return { perRow, catUnique: [...new Set(catW)], subUnique: [...new Set(subW.flat())], catW, subW, trunc };
  });

  const fs = require('fs');
  await page.evaluate(() => { const b = document.querySelector('.cwb-body'); if (b) b.scrollTo(0, b.scrollHeight); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/cwb-cat-equal.png` });
  console.log('exists-after-shot=' + fs.existsSync(`${OUT}/cwb-cat-equal.png`));
  console.log(JSON.stringify({ ...data, errors }, null, 1));
  await browser.close();
  console.log('exists-after-close=' + fs.existsSync(`${OUT}/cwb-cat-equal.png`));
})();
