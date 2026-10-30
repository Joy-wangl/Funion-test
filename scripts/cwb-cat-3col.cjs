const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.cwb-tabs button')].find((b) => b.textContent.trim() === '标记会话')?.click(); });
  await page.waitForTimeout(900);
  const readCats = () => page.evaluate(() => {
    const items = [...document.querySelectorAll('.cwb-cat-item')];
    const rows = {};
    const list = items.map((it) => {
      const btn = it.querySelector('.cwb-cat-tag');
      const r = btn.getBoundingClientRect();
      const key = Math.round(r.top);
      (rows[key] = rows[key] || []).push(it.querySelector('.cwb-cat-name')?.textContent.trim());
      return {
        name: it.querySelector('.cwb-cat-name')?.textContent.trim(),
        w: Math.round(r.width),
        open: !!it.querySelector('.cwb-sub-row'),
        shut: btn.classList.contains('shut'),
      };
    });
    return { perRow: Object.values(rows), widths: [...new Set(list.map((x) => x.w))], list };
  });
  const init = await readCats();
  await page.screenshot({ path: 'D:/PM.funion/screenshots/cwb-cat-3col-open.png' });
  const clickCat = (name) => page.evaluate((t) => {
    const el = [...document.querySelectorAll('.cwb-cat-item .cwb-cat-name')].find((n) => n.textContent.trim() === t);
    if (el) el.closest('.cwb-cat-tag')?.click();
    return !!el;
  }, name);
  await clickCat('质量问题');
  await page.waitForTimeout(250);
  const afterCollapse = await readCats();
  await page.screenshot({ path: 'D:/PM.funion/screenshots/cwb-cat-3col-shut.png' });
  await clickCat('质量问题');
  await page.waitForTimeout(250);
  const afterReopen = await readCats();
  // sub click still tags
  await page.evaluate(() => {
    const it = [...document.querySelectorAll('.cwb-cat-item')].find((x) => x.querySelector('.cwb-cat-name')?.textContent.trim() === '质量问题');
    it?.querySelector('.cwb-sub')?.click();
  });
  await page.waitForTimeout(300);
  const toast = await page.evaluate(() => [...document.querySelectorAll('.toast-wrap .toast .msg')].map((m) => m.textContent.trim()));
  const groups = await page.evaluate(() => [...document.querySelectorAll('.cwb-sel-group')].map((g) => g.querySelector('.cwb-code-gt')?.textContent.trim()));
  console.log(JSON.stringify({ initPerRow: init.perRow, widths: init.widths, allOpen: init.list.every((x) => x.open), afterCollapse: afterCollapse.list.filter((x) => x.name === '质量问题' || x.name === '物流问题'), afterReopenOpen: afterReopen.list.every((x) => x.open), toast, groups, errors }, null, 2));
  await browser.close();
})();
