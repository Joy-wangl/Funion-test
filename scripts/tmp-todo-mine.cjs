/* 验证：待办任务·我发起的 三态还原（别人已处理/待人未处理/多人任务） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const r = {};

  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  for (let i = 0; i < 20; i++) {
    if (await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].some((e) => e.textContent.trim() === '待办任务'))) break;
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '待办任务');
    t.click();
  });
  await page.waitForSelector('.qc-todo-page');
  await page.evaluate(() => [...document.querySelectorAll('.qc-todo-pill button')].find((b) => b.textContent.includes('我发起')).click());
  await page.waitForTimeout(300);

  r.mineCards = await page.locator('.qc-todo-card').count();
  r.mineChips = await page.locator('.qc-todo-card .td-st').allTextContents();
  r.mineNames = await page.locator('.qc-todo-card .td-name').allTextContents();
  r.mineAvas = await page.locator('.qc-todo-card').evaluateAll((cs) => cs.map((c) => c.querySelectorAll('.td-avas .td-ava').length));
  r.mineTag = await page.locator('.qc-todo-card .td-tag.mine').count();
  await page.screenshot({ path: `${OUT}/todo-mine-list.png` });

  /* 图一：别人已处理（TD-005） */
  await page.locator('.qc-todo-card').nth(1).click({ position: { x: 300, y: 24 } });
  await page.waitForSelector('.qc-todo-detail');
  await page.waitForTimeout(300);
  r.done = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-detail');
    return {
      id: d.querySelector('.qd-id')?.textContent.trim(),
      title: d.querySelector('.qd-title')?.textContent.trim(),
      sender: d.querySelector('.qd-sender b')?.textContent.trim(),
      rows: [...d.querySelectorAll('.qd-lab')].map((l, i) => l.textContent.trim() + '=' + [...d.querySelectorAll('.qd-val')][i]?.textContent.trim()),
      tabs: [...d.querySelectorAll('.qd-tabs button')].map((b) => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')),
      text: d.querySelector('.qd-text')?.textContent.trim(),
      atts: d.querySelectorAll('.qd-att').length,
      imgs: d.querySelectorAll('.qd-img').length,
      foot: d.querySelectorAll('.qd-foot button').length,
    };
  });
  r.doneGeom = await page.evaluate(() => {
    const p = document.querySelector('.qc-todo-page');
    const g = (e) => (e ? { x: Math.round(e.getBoundingClientRect().x), w: Math.round(e.getBoundingClientRect().width) } : null);
    return { page: g(p), main: g(p.querySelector('.qc-todo-main')), detail: g(p.querySelector('.qc-todo-detail')), vw: window.innerWidth };
  });
  await page.screenshot({ path: `${OUT}/todo-mine-done.png` });

  /* 图二：待人未处理（TD-004） */
  await page.click('.qc-todo-detail .qd-close');
  await page.waitForTimeout(200);
  await page.locator('.qc-todo-card').nth(0).click({ position: { x: 300, y: 24 } });
  await page.waitForSelector('.qc-todo-detail');
  await page.waitForTimeout(300);
  r.pending = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-detail');
    return {
      rows: [...d.querySelectorAll('.qd-lab')].map((l, i) => l.textContent.trim() + '=' + [...d.querySelectorAll('.qd-val')][i]?.textContent.trim()),
      tabs: [...d.querySelectorAll('.qd-tabs button')].map((b) => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')),
      foot: [...d.querySelectorAll('.qd-foot button')].map((b) => b.textContent.trim() + ':' + b.className),
    };
  });
  await page.click('.qc-todo-detail .qd-tabs button:has-text("处理流程")');
  await page.waitForTimeout(200);
  r.pendingFlow = await page.locator('.qc-todo-detail .qd-flow').allTextContents();
  await page.screenshot({ path: `${OUT}/todo-mine-pending.png` });

  /* 图三：多人任务（TD-006） */
  await page.click('.qc-todo-detail .qd-close');
  await page.waitForTimeout(200);
  await page.locator('.qc-todo-card').nth(2).click({ position: { x: 300, y: 24 } });
  await page.waitForSelector('.qc-todo-handlers');
  await page.waitForTimeout(300);
  r.multi = await page.evaluate(() => {
    const h = document.querySelector('.qc-todo-handlers');
    return {
      head: h.querySelector('.qh-head')?.textContent.trim().replace(/\s+/g, ' '),
      ph: h.querySelector('input')?.placeholder,
      sel: h.querySelector('.bselect-text')?.textContent.trim(),
      cards: [...h.querySelectorAll('.qh-card')].map((c) => ({
        on: c.classList.contains('on'),
        who: c.querySelector('.qh-who')?.textContent.trim().replace(/\s+/g, ' '),
        t: c.querySelector('.qh-t')?.textContent.trim().replace(/\s+/g, ' '),
        sub: c.querySelector('.qh-sub')?.textContent.trim().replace(/\s+/g, ' '),
        st: c.querySelector('.qh-st')?.textContent.trim() + '/' + c.querySelector('.qh-st')?.className,
        act: c.querySelector('.qh-act') ? c.querySelector('.qh-act').textContent.trim() + '/' + c.querySelector('.qh-act').className : null,
      })),
      detailTabs: [...document.querySelectorAll('.qc-todo-detail .qd-tabs button')].map((b) => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')),
    };
  });
  r.multiGeom = await page.evaluate(() => {
    const p = document.querySelector('.qc-todo-page');
    const g = (e) => (e ? { x: Math.round(e.getBoundingClientRect().x), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : null);
    const h = p.querySelector('.qc-todo-handlers');
    const d = p.querySelector('.qc-todo-detail');
    return { page: g(p), main: g(p.querySelector('.qc-todo-main')), handlers: g(h), detail: g(d), vw: window.innerWidth, hScroll: h ? h.scrollWidth > h.clientWidth : null, dScroll: d ? d.scrollHeight > d.clientHeight : null };
  });
  await page.screenshot({ path: `${OUT}/todo-mine-multi.png` });

  /* 处理人搜索 + 状态筛选 */
  await page.fill('.qc-todo-handlers input', '文');
  await page.waitForTimeout(200);
  r.searchWen = await page.locator('.qc-todo-handlers .qh-who').allTextContents();
  await page.fill('.qc-todo-handlers input', '');
  await page.click('.qc-todo-handlers .bselect-trigger');
  await page.waitForTimeout(300);
  r.hOpts = await page.locator('.bselect-opt').allTextContents();
  await page.evaluate(() => {
    const o = [...document.querySelectorAll('.bselect-opt')].find((e) => e.textContent.trim() === '已处理');
    o.click();
  });
  await page.waitForTimeout(300);
  r.filterYcl = await page.locator('.qc-todo-handlers .qh-st').allTextContents();
  await page.screenshot({ path: `${OUT}/todo-mine-multi-filter.png` });

  r.errors = errors.slice(0, 6);
  fs.writeFileSync('D:/PM.funion/scripts/tmp-todo-mine.json', JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message.split('\n')[0]); process.exit(1); });
