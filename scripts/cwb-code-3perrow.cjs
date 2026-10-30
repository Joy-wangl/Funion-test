const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  const clickByText = (sel, text) => page.evaluate(([s, t]) => {
    const el = [...document.querySelectorAll(s)].find((n) => n.textContent.trim() === t);
    if (el) el.click();
    return !!el;
  }, [sel, text]);

  await clickByText('.cwb-tab', '标记会话');
  await page.waitForTimeout(400);
  await clickByText('.cwb-gran button', '商品编码');
  await page.waitForTimeout(400);

  const chips = await page.evaluate(() => {
    const tags = [...document.querySelectorAll('.cwb-code-tags .cwb-code-tag')];
    const rows = {};
    tags.forEach((t) => {
      const r = t.getBoundingClientRect();
      const key = Math.round(r.top);
      (rows[key] = rows[key] || []).push(t.textContent.trim());
      return r;
    });
    const gt = document.querySelector('.cwb-code-gt');
    return {
      texts: tags.map((t) => t.textContent.trim()),
      titles: tags.map((t) => t.getAttribute('title')),
      perRow: Object.values(rows),
      groupTitle: gt ? gt.textContent.trim() : null,
      visible: tags.every((t) => { const r = t.getBoundingClientRect(); return r.width > 0 && r.height > 0; }),
    };
  });
  await page.screenshot({ path: `${OUT}/cwb-code-3perrow.png`, fullPage: false });

  // 全部 select-all / multi-select semantics unchanged
  await clickByText('.cwb-code-tags .cwb-code-all', '全部');
  await page.waitForTimeout(250);
  const afterAll = await page.evaluate(() => [...document.querySelectorAll('.cwb-code-tags .cwb-code-tag')].map((t) => ({ text: t.textContent.trim(), on: t.classList.contains('on') })));
  const firstCodeIdx = await page.evaluate(() => [...document.querySelectorAll('.cwb-code-tags .cwb-code-tag')].findIndex((t) => t.textContent.trim() !== '全部'));
  if (firstCodeIdx >= 0) {
    await page.evaluate((i) => document.querySelectorAll('.cwb-code-tags .cwb-code-tag')[i].click(), firstCodeIdx);
  }
  await page.waitForTimeout(250);
  const afterOne = await page.evaluate(() => [...document.querySelectorAll('.cwb-code-tags .cwb-code-tag')].map((t) => ({ text: t.textContent.trim(), on: t.classList.contains('on') })));
  const tagTarget = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.cwb-tag-chip, .cwb-tags .cwb-tag')].map((n) => n.textContent.trim());
    return el;
  });
  await page.screenshot({ path: `${OUT}/cwb-code-3perrow-multi.png`, fullPage: false });

  console.log(JSON.stringify({ chips, afterAll, afterOne, tagTarget, errors }, null, 2));
  await browser.close();
})();
