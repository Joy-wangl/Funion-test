const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const nav = [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '待办任务');
    nav && nav.closest('a,button,div[class]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const seg = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === '任务待办');
    seg && seg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const card = document.querySelector('.qc-todo-card, .td-files')?.closest('div');
    const rows = [...document.querySelectorAll('.td-files')].slice(0, 4).map((f) =>
      [...f.children].map((c) => ({ cls: c.className, txt: c.textContent.trim().slice(0, 30), w: c.getBoundingClientRect().width, h: c.getBoundingClientRect().height })));
    return { rows, hasOverlay: !!document.querySelector('vite-error-overlay') };
  });
  console.log(JSON.stringify(info, null, 2));
  const box = await page.evaluate(() => {
    const el = document.querySelector('.td-files');
    if (!el) return null;
    const r = el.closest('.qc-center-page [class*=card], .qc-center-page div')?.getBoundingClientRect() || el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (box) await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-att-thumb.png', clip: { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 90), width: Math.min(1580, box.width + 20), height: box.height + 120 } });
  console.log('ERRORS', errors.slice(0, 3));
  await browser.close();
})();
