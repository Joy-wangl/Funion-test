/* 验证：评价数据入口 → 详情抽屉（商品维度）
   1) 头部右侧 .qc-hero-score 双灰卡（商品体验分/内部商品分）有值
   2) 售后数据场景：导轨「全部类型」计数 == 明细表行数（数据闭环，禁空表） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
const BASE = 'http://127.0.0.1:5173/';

const clickByText = (page, sel, text) =>
  page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, [sel, text]);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);

  const r = {};
  /* 导航：品控-线上 → 评价数据（店铺监控子导航默认已展开，直接点子项，勿点父级以免收起） */
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(400);
  r['nav.review'] = await clickByText(page, '.qc-subnav', '评价数据');
  await page.waitForSelector('.qc-rv-ov', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);

  /* 看板 → 钻入列表（评价订单数卡） */
  r['board.present'] = (await page.locator('.qc-rv-ov').count()) > 0;
  await page.locator('.qc-rv-ov .flat-card.clickable').first().click();
  await page.waitForSelector('.qc-ss-sec table tbody tr', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  r['list.rows'] = await page.locator('.qc-ss-sec table tbody tr').count();

  /* 操作列「详情」开抽屉 */
  await page.locator('.qc-ss-sec .qc-rv-op a').first().click();
  await page.waitForTimeout(700);

  /* 1) 头部双灰卡 */
  r['hero.present'] = (await page.locator('.qc-hero-score').count()) === 1;
  r['hero.twoCards'] = (await page.locator('.qc-hero-score .sc-card').count()) === 2;
  const lbs = await page.locator('.qc-hero-score .sc-card .lb').allTextContents();
  const vals = await page.locator('.qc-hero-score .sc-card .v').allTextContents();
  r['hero.labels'] = lbs.map((t) => t.trim());
  r['hero.values'] = vals.map((t) => t.trim());
  r['hero.hasExpLabel'] = lbs.some((t) => t.includes('商品体验分'));
  r['hero.hasScoreLabel'] = lbs.some((t) => t.includes('内部商品分'));
  r['hero.valuesNonEmpty'] = vals.length === 2 && vals.every((v) => v.trim().length > 0);
  await page.screenshot({ path: `${OUT}/rv-drawer-hero-score.png` });

  /* 2) 售后数据场景闭环 */
  r['scene.after'] = await clickByText(page, '.qc-d-rail button', '售后数据');
  await page.waitForTimeout(600);
  const pillTxt = await page.locator('.qc-d-seg button').first().textContent();
  const pillCount = Number((pillTxt || '').replace(/[^0-9]/g, ''));
  const rowCount = await page.locator('.qc-ao-panel table.ao-table tbody tr').count();
  r['after.pillAll'] = (pillTxt || '').trim();
  r['after.pillCount'] = pillCount;
  r['after.rowCount'] = rowCount;
  r['after.pillPositive'] = pillCount > 0;
  r['after.rowsPositive'] = rowCount > 0;
  r['after.rowsMatchPill'] = rowCount === Math.min(pillCount, 20);
  await page.screenshot({ path: `${OUT}/rv-drawer-after-rows.png` });

  r['noErrors'] = errs.length === 0;
  if (errs.length) console.log(errs.slice(0, 8).join('\n'));

  await browser.close();
  console.log(JSON.stringify(r, null, 2));
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
