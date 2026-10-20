/* 诊断：待办页发起抽屉挂载数量与 .mask 遮挡来源 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 2000, height: 1130 } });
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '待办任务')?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.qc-todo-new')?.click());
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const drawers = [...document.querySelectorAll('.qc-todo-create')];
    const masks = [...document.querySelectorAll('.mask')];
    const pbs = [...document.querySelectorAll('.qc-tc-pickbox')];
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    return {
      drawers: drawers.map((d) => ({ vis: vis(d), parent: d.parentElement?.className?.slice(0, 40), rect: (r => ({ x: Math.round(r.x), w: Math.round(r.width) }))(d.getBoundingClientRect()) })),
      masks: masks.map((m) => ({ vis: vis(m), z: getComputedStyle(m).zIndex, parent: m.parentElement?.className?.slice(0, 50), title: m.nextElementSibling?.querySelector?.('.m-title')?.textContent ?? m.parentElement?.querySelector?.('.m-title')?.textContent ?? null })),
      pickboxes: pbs.map((p) => ({ vis: vis(p), inDrawer: !!p.closest('.qc-todo-create') })),
      drawerMasks: [...document.querySelectorAll('.drawer-mask')].map((m) => ({ vis: vis(m), z: getComputedStyle(m).zIndex })),
      drawerZ: drawers.map((d) => getComputedStyle(d).zIndex),
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-dlpop-probe.png' });
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
