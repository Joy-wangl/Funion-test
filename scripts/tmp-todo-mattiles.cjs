const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.qc-nav-text')].find((n) => n.textContent.trim() === '待办任务')?.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { [...document.querySelectorAll('.qc-todo-pill button')].find((b) => b.textContent.replace(/\s/g, '').endsWith('待处理的'))?.click(); });
  await page.waitForTimeout(400);

  const readCard = () => page.evaluate(() => {
    const card = [...document.querySelectorAll('.qc-todo-card')].find((c) => c.textContent.includes('保温杯主图与详情页专项优化'));
    if (!card) return null;
    const tiles = [...card.querySelectorAll('.td-meta > .td-tile')];
    const kindOf = (tl) => (tl.querySelector('.td-good') ? 'good' : tl.querySelector('.td-thumb.video') ? 'video' : tl.querySelector('.td-thumb') ? 'image' : tl.querySelector('.td-file') ? 'file' : '?');
    const good = card.querySelector('.td-good');
    const name = card.querySelector('.tg-name');
    const subs = [...card.querySelectorAll('.tg-sub')].map((s) => s.textContent.replace(/\s/g, ''));
    const thumb = card.querySelector('.td-thumb');
    const file = card.querySelector('.td-file');
    return {
      kinds: tiles.map(kindOf),
      more: [...card.querySelectorAll('.td-more')].map((m) => m.textContent.trim()),
      goodH: good ? good.getBoundingClientRect().height : null,
      thumbH: thumb ? thumb.getBoundingClientRect().height : null,
      fileH: file ? file.getBoundingClientRect().height : null,
      nameStyle: name ? `${getComputedStyle(name).fontSize}/${getComputedStyle(name).fontWeight}/${getComputedStyle(name).color}` : null,
      subs,
      platImg: !!card.querySelector('.tg-plat img') && card.querySelector('.tg-plat img').naturalWidth > 0,
    };
  });

  const base = await readCard();
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-card-goodcard-ref.png', clip: { x: 200, y: 260, width: 1400, height: 260 } });

  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('qcTodoData.ts')) ?? '/src/pages/quality/qcTodoData.ts';
    const m = await import(/* @vite-ignore */ url);
    const t = m.QC_TODOS.find((x) => x.id === 'TD-001');
    t.files = [...(t.files ?? []), ...Array.from({ length: 4 }, (_, i) => ({ id: `PX-${i}`, name: `补充截图-${i}.png`, size: 102400, kind: 'image', url: '/products/main.png' }))];
    window.__mut = { url, len: t.files.length };
  });
  await page.waitForTimeout(500);
  const over = await readCard();
  const maskBg = await page.evaluate(() => {
    const el = document.querySelector('.qc-todo-card .td-more');
    return el ? getComputedStyle(el).backgroundColor : null;
  });
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-card-mattiles-overflow.png', clip: { x: 200, y: 260, width: 1400, height: 260 } });
  console.log(JSON.stringify({ base, over, maskBg, mut: await page.evaluate(() => window.__mut), errs }, null, 2));
  await browser.close();
})();
