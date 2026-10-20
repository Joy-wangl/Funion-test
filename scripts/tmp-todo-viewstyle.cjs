/* 查看态样式核对（图一口径）：待办页抽屉 / 店铺商品优化任务抽屉 / 待处理查看态
   断言：内容区白底、消息id灰带通栏、空附件/图片段隐藏、图片为真实缩略图 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';

const poll = async (page, fn, ms = 8000) => {
  for (let i = 0; i < ms / 200; i++) {
    if (await page.evaluate(fn)) return true;
    await page.waitForTimeout(200);
  }
  return false;
};

const probeDrawer = (sel) => {
  const d = document.querySelector(sel);
  if (!d) return null;
  const body = d.querySelector('.qd-body');
  const id = d.querySelector('.qd-id, .qhd-idbar');
  const dr = d.getBoundingClientRect();
  const ir = id ? id.getBoundingClientRect() : null;
  const bs = body ? getComputedStyle(body) : null;
  return {
    drawer: { x: Math.round(dr.x), w: Math.round(dr.width) },
    idBand: ir ? { x: Math.round(ir.x), w: Math.round(ir.width), bg: getComputedStyle(id).backgroundColor } : null,
    bandFlush: ir ? Math.abs(ir.x - dr.x) <= 1 && Math.abs(ir.top - dr.top) <= 1 : null,
    bodyBg: bs ? bs.backgroundColor : null,
    placeholderImgs: d.querySelectorAll('.qd-img:not(.real)').length,
    realImgs: d.querySelectorAll('.qd-img.real, .qhd-img').length,
    attChips: d.querySelectorAll('.qd-att').length,
    lab2: [...d.querySelectorAll('.qd-lab2')].map((e) => e.textContent.trim()),
    divs: d.querySelectorAll('.qhd-div').length,
  };
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  const out = {};

  const navTo = async (name) => {
    let ok = false;
    for (let i = 0; i < 75; i++) {
      if (await page.evaluate((n) => [...document.querySelectorAll('.qc-nav-text')].some((e) => e.textContent.trim() === n), name)) { ok = true; break; }
      await page.waitForTimeout(200);
    }
    if (!ok) throw new Error('nav not found ' + name);
    await page.evaluate((n) => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === n).click(), name);
    await page.waitForTimeout(500);
  };

  /* ---------- 待办任务页抽屉 ---------- */
  await navTo('待办任务');
  await poll(page, () => [...document.querySelectorAll('.qc-todo-pill button')].some((e) => e.textContent.includes('我发起')));
  await page.evaluate(() => [...document.querySelectorAll('.qc-todo-pill button')].find((e) => e.textContent.includes('我发起')).click());
  await poll(page, () => document.querySelectorAll('.qc-todo-card').length > 1);
  /* 已完成卡（处理结果页签）：白底＋结果附件芯片、无图片占位 */
  await page.evaluate(() => document.querySelectorAll('.qc-todo-card')[1].click());
  await poll(page, () => !!document.querySelector('.qc-todo-page-drawer'));
  out.doneResult = await page.evaluate(probeDrawer, '.qc-todo-page-drawer');
  await page.screenshot({ path: `${OUT}/todo-view-done.png` });
  /* 事项页签（带附件卡）：正文＋发丝线＋芯片＋真实缩略图 */
  await page.evaluate(() => document.querySelector('.qd-close').click());
  await poll(page, () => !document.querySelector('.qc-todo-page-drawer'));
  await page.evaluate(() => document.querySelectorAll('.qc-todo-card')[2].click());
  await poll(page, () => !!document.querySelector('.qc-todo-page-drawer'));
  out.pendingItems = await page.evaluate(probeDrawer, '.qc-todo-page-drawer');
  await page.screenshot({ path: `${OUT}/todo-view-items.png` });
  await page.evaluate(() => document.querySelector('.qd-close').click());

  /* ---------- 店铺商品·优化任务抽屉 ---------- */
  await navTo('店铺商品');
  await poll(page, () => [...document.querySelectorAll('td.qc-sg-op a')].some((e) => e.textContent.trim() === '优化任务'), 12000);
  await page.evaluate(() => [...document.querySelectorAll('td.qc-sg-op a')].find((e) => e.textContent.trim() === '优化任务').click());
  await poll(page, () => !!document.querySelector('.qc-todo-detail-drawer'));
  out.shopOpt = await page.evaluate(probeDrawer, '.qc-todo-detail-drawer');
  /* 事项页签（若存在） */
  const hasItems = await page.evaluate(() => [...document.querySelectorAll('.qc-todo-detail-drawer .qd-tabs button')].some((b) => b.textContent.trim() === '事项'));
  if (hasItems) {
    await page.evaluate(() => [...document.querySelectorAll('.qc-todo-detail-drawer .qd-tabs button')].find((b) => b.textContent.trim() === '事项').click());
    await page.waitForTimeout(300);
    out.shopOptItems = await page.evaluate(probeDrawer, '.qc-todo-detail-drawer');
  }
  await page.screenshot({ path: `${OUT}/todo-view-shopopt.png` });
  await page.evaluate(() => document.querySelector('.qc-todo-detail-drawer .drawer-foot button').click());

  /* ---------- 待处理·查看态（收件卡点击） ---------- */
  await navTo('待办任务');
  await poll(page, () => [...document.querySelectorAll('.qc-todo-pill button')].some((e) => e.textContent.includes('待处理')));
  await page.evaluate(() => [...document.querySelectorAll('.qc-todo-pill button')].find((e) => e.textContent.includes('待处理')).click());
  await poll(page, () => document.querySelectorAll('.qc-todo-card').length > 0);
  await page.evaluate(() => document.querySelectorAll('.qc-todo-card')[0].click());
  await poll(page, () => !!document.querySelector('.qc-todo-handle-drawer'));
  out.handleView = await page.evaluate(probeDrawer, '.qc-todo-handle-drawer');
  await page.screenshot({ path: `${OUT}/todo-view-handle.png` });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
