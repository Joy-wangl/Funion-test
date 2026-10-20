/* 详情抽屉「历史优化任务」页签验证：店铺列表优化任务入口 → 页签 → 任务左列＋详情切换 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.qc-nav-text')].find((n) => n.textContent.trim() === '店铺商品')?.click(); });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('tr')].find((r) => r.textContent.includes('云感布艺沙发'));
    const a = [...(row?.querySelectorAll('a') ?? [])].find((x) => x.textContent.trim() === '优化任务');
    a?.click();
  });
  await page.waitForTimeout(700);
  const out = {};
  out.tabs = await page.evaluate(() => [...document.querySelectorAll('.qc-todo-detail-drawer .qd-tabs button')].map((b) => b.textContent.trim()));
  await page.evaluate(() => { [...document.querySelectorAll('.qc-todo-detail-drawer .qd-tabs button')].find((b) => b.textContent.trim() === '历史优化任务')?.click(); });
  await page.waitForTimeout(500);
  out.pane = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-detail-drawer');
    return {
      width: Math.round(d?.getBoundingClientRect().width ?? 0),
      cards: [...document.querySelectorAll('.qdh-tasks .qh-card')].map((c) => ({ t: c.querySelector('.qdh-title')?.textContent.trim(), st: c.querySelector('.qh-st')?.textContent.trim(), on: c.classList.contains('on') })),
      detailTitle: document.querySelector('.qdh-detail .qd-title')?.textContent.trim(),
      detailRows: [...document.querySelectorAll('.qdh-detail .qd-lab')].map((l) => l.textContent.trim()),
    };
  });
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-hist-tab.png' });
  await page.evaluate(() => { document.querySelectorAll('.qdh-tasks .qh-card')[1]?.click(); });
  await page.waitForTimeout(400);
  out.afterSwitch = await page.evaluate(() => ({
    detailTitle: document.querySelector('.qdh-detail .qd-title')?.textContent.trim(),
    result: document.querySelector('.qdh-detail .qd-text')?.textContent.trim().slice(0, 30),
    atts: [...document.querySelectorAll('.qdh-detail .qd-atts .qd-att')].map((a) => a.textContent.trim()),
    onIdx: [...document.querySelectorAll('.qdh-tasks .qh-card')].findIndex((c) => c.classList.contains('on')),
  }));
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-hist-tab-switch.png' });
  out.errs = errs;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
