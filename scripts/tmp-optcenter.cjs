/* 验证：任务中心父级路由（待办事项+优化任务）＋优化任务列表页（分型/创建/指标对比/详情） */
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
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(400);

  /* 1) 任务中心父级 + 子路由 */
  const navTexts = await page.locator('.qc-nav').allTextContents();
  r['nav.hasTaskCenter'] = navTexts.some((t) => t.includes('任务中心'));
  r['nav.oldTodoGone'] = !navTexts.some((t) => t.trim() === '待办任务');
  r['nav.hasTodoItem'] = navTexts.some((t) => t.includes('待办事项'));
  r['nav.hasOptItem'] = navTexts.some((t) => t.includes('优化任务'));

  /* 2) 待办事项 = 原待办列表 */
  await clickByText(page, '.qc-subnav', '待办事项');
  await page.waitForTimeout(500);
  r['todo.renders'] = (await page.locator('.qc-todo-page').count()) > 0;

  /* 3) 优化任务列表 */
  await clickByText(page, '.qc-subnav', '优化任务');
  await page.waitForSelector('.qc-opt-page table tbody tr', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  r['opt.renders'] = (await page.locator('.qc-opt-page').count()) === 1;
  const rowCount = await page.locator('.qc-opt-page tbody tr').count();
  r['opt.rows'] = rowCount;
  r['opt.rowsPositive'] = rowCount > 0;
  r['opt.metricCells'] = (await page.locator('.qc-opt-page .qo-mx').count()) > 0;
  const kinds = await page.locator('.qc-opt-page tbody tr td:nth-child(2) .tag').allTextContents();
  r['opt.kinds'] = [...new Set(kinds.map((t) => t.trim()))];
  await page.screenshot({ path: `${OUT}/opt-task-list.png` });

  /* 4) 分型筛选：店铺优化 */
  await page.locator('.qc-opt-page .sg-field:has-text("优化类型") .bselect-trigger').click();
  await page.waitForTimeout(250);
  await clickByText(page, '.bselect-menu .bselect-opt', '店铺优化');
  await page.waitForTimeout(400);
  const kinds2 = await page.locator('.qc-opt-page tbody tr td:nth-child(2) .tag').allTextContents();
  r['filter.shopOnly'] = kinds2.length > 0 && kinds2.every((t) => t.trim() === '店铺优化');
  /* 还原全部 */
  await page.locator('.qc-opt-page .sg-field:has-text("优化类型") .bselect-trigger').click();
  await page.waitForTimeout(250);
  await clickByText(page, '.bselect-menu .bselect-opt', '全部');
  await page.waitForTimeout(400);

  /* 5) 创建任务抽屉 */
  await clickByText(page, '.qc-opt-page .sg-btn', '创建任务');
  await page.waitForTimeout(500);
  r['create.opens'] = (await page.locator('.qc-todo-create').count()) === 1;
  await page.screenshot({ path: `${OUT}/opt-task-create.png` });
  await page.locator('.qc-todo-create .drawer-mask, .drawer-mask').first().click().catch(() => {});
  await page.waitForTimeout(400);
  r['create.closes'] = (await page.locator('.qc-todo-create').count()) === 0;

  /* 6) 详情抽屉 */
  await page.locator('.qc-opt-page .qc-op-col a').first().click();
  await page.waitForTimeout(500);
  r['detail.opens'] = (await page.locator('.qc-todo-detail-drawer').count()) === 1;
  await page.screenshot({ path: `${OUT}/opt-task-detail.png` });

  r['noErrors'] = errs.length === 0;
  if (errs.length) console.log(errs.slice(0, 8).join('\n'));
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
