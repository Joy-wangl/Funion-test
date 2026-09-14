/* 验证：素材中心头部标题/副题已删除，返回与 tab 保留 */
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
  const subTaobao = page.locator('.ops-center .side .subnav:has-text("淘宝")');
  if (!(await subTaobao.isVisible())) {
    await page.click('.ops-center .side .nav-parent:has-text("商品创建")');
    await subTaobao.waitFor({ state: 'visible' });
  }
  await page.click('.ops-center .side .subnav:has-text("淘宝")');
  await page.waitForSelector('.page.show .create-table');
  await page.click('.page.show .create-ops a:has-text("详情")');
  await page.waitForSelector('.page.show .cpd-page');
  await page.click('.cpd-page button:has-text("编辑")');
  await page.click('.cpd-side-acts .cpd-side-btn:has-text("素材")');
  await page.waitForSelector('.mc-page');

  r.titleGone = (await page.locator('.mc-title').count()) === 0;
  r.subGone = (await page.locator('.mc-sub').count()) === 0;
  r.backKept = (await page.locator('.mc-back').count()) === 1;
  r.tabsKept = (await page.locator('.mc-tab').count()) === 3;
  r.headText = ((await page.locator('.mc-head').textContent()) || '').trim() === '←';
  await page.screenshot({ path: `${OUT}/mc-head-clean.png`, clip: { x: 220, y: 60, width: 1380, height: 150 } });

  await browser.close();
  r.errors = errors;
  console.log(JSON.stringify(r, null, 2));
  const pass = Object.entries(r).every(([k, v]) => (k === 'errors' ? v.length === 0 : v === true));
  console.log(pass ? 'ALL PASS' : 'HAS FAIL');
})().catch((e) => { console.error(e); process.exit(1); });
