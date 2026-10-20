/* 验证：历史优化任务行态抽屉——关闭按钮置底（底栏横跨详情列），右侧禁露原生滚动条竖列 */
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
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);
  const r = {};
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(400);
  await clickByText(page, '.qc-subnav', '店铺商品');
  await page.waitForSelector('.qc-center-page tbody tr', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  /* 操作列「优化任务」链接打开关联待办详情抽屉（标签本身仅展示不可点） */
  r['op.found'] = await page.evaluate(() => {
    const a = [...document.querySelectorAll('.qc-center-page tbody a')].find((e) => e.textContent.trim() === '优化任务');
    if (!a) return false;
    a.click();
    return true;
  });
  await page.waitForSelector('.qc-todo-detail-drawer', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  r['drawer.open'] = (await page.locator('.qc-todo-detail-drawer').count()) === 1;
  r['tab.hist'] = await clickByText(page, '.qc-todo-detail-drawer .qd-tabs button', '历史优化任务');
  await page.waitForSelector('.qc-todo-detail-drawer .qdh-rail', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  r['row.rail'] = (await page.locator('.qc-todo-detail-drawer .qdh-rail').count()) === 1;

  const drawer = await page.locator('.qc-todo-detail-drawer').boundingBox();
  const rail = await page.locator('.qc-todo-detail-drawer .qdh-rail').boundingBox();
  const foot = await page.locator('.qc-todo-detail-drawer .drawer-foot').boundingBox();
  const btn = await page.locator('.qc-todo-detail-drawer .drawer-foot .btn').boundingBox();
  const dBot = drawer.y + drawer.height;
  r['foot.atBottom'] = Math.abs(foot.y + foot.height - dBot) < 4;
  r['btn.atBottom'] = btn.y > drawer.y + drawer.height * 0.6;
  r['btn.notTopRight'] = !(btn.y < drawer.y + 80);
  r['foot.spansDetailCol'] = foot.width > 400 && foot.x >= rail.x + rail.width - 6;
  r['rail.fullHeight'] = Math.abs(rail.height - drawer.height) < 4;
  const sbw = await page.locator('.qc-todo-detail-drawer .drawer-body').evaluate((el) => getComputedStyle(el).scrollbarWidth);
  r['body.scrollbarHidden'] = sbw === 'none';
  await page.screenshot({ path: `${OUT}/todo-hist-foot-bottom.png` });
  r['noErrors'] = errs.length === 0;
  if (errs.length) console.log(errs.slice(0, 6).join('\n'));
  console.log(JSON.stringify({ drawer, rail, foot, btn, ...r }, null, 2));
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
