/* 验证：智能运营中心顶栏（铃铛横条）sticky 固定顶部——内容下滚时不消失 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const r = {};

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');
  const sub = page.locator('.ops-center .side .subnav:has-text("内部商机")');
  if (!(await sub.isVisible())) {
    await page.click('.ops-center .side .nav-parent:has-text("商机中心")');
    await sub.waitFor({ state: 'visible' });
  }
  await sub.click();
  await page.waitForSelector('.page.show .ib-table');

  const topbar = page.locator('.ops-center .ops-topbar');
  const y0 = (await topbar.boundingBox())?.y ?? -1;
  r.initial = y0 > 0 && y0 < 120;

  /* 滚动容器为 .app-content：滚到底后顶栏应仍贴在容器顶 */
  await page.evaluate(() => {
    const el = document.querySelector('.app-content');
    if (el) el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(300);
  const scrolled = await page.evaluate(() => document.querySelector('.app-content')?.scrollTop ?? 0);
  /* 本页表格内滚，页级可滚距离有限（约 163px），滚到底即验证 */
  r.scrolled = scrolled >= 100;
  const y1 = (await topbar.boundingBox())?.y ?? -1;
  r.sticky = Math.abs(y1 - y0) < 2;
  r.bellVisible = await page.locator('.ops-center .msg-bell-btn').isVisible();
  /* 顶栏盖在内容之上：表格行不应遮挡铃铛点击 */
  const bellY = (await page.locator('.ops-center .msg-bell-btn').boundingBox())?.y ?? 999;
  r.bellAbove = bellY < y1 + 60;
  await page.screenshot({ path: `${OUT}/ops-topbar-sticky.png` });

  /* 回顶后布局复原 */
  await page.evaluate(() => {
    const el = document.querySelector('.app-content');
    if (el) el.scrollTop = 0;
  });
  await page.waitForTimeout(300);
  const y2 = (await topbar.boundingBox())?.y ?? -1;
  r.backTop = Math.abs(y2 - y0) < 2;

  await browser.close();
  r.errors = errors;
  console.log(JSON.stringify(r, null, 2));
  const pass = Object.entries(r).every(([k, v]) => (k === 'errors' ? v.length === 0 : v === true));
  console.log(pass ? 'ALL PASS' : 'HAS FAIL');
})().catch((e) => { console.error(e); process.exit(1); });
