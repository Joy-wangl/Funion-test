/* 验证：编码监控-监控列表「优化任务」→ 发起待办抽屉（系列编码优化/商品编码优化）；
   以及 店铺商品「优化任务」→ 商品优化（关联商品改必填）。 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
const BASE = 'http://127.0.0.1:5173/';

const clickByText = (page, sel, text) =>
  page.evaluate(
    ([sel, text]) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
      if (!el) return 'miss:' + text;
      el.click();
      return 'ok';
    },
    [sel, text],
  );

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle' });

  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(500);

  /* 进入 编码监控 → 监控列表 */
  await clickByText(page, '.qc-nav-parent .qc-nav-text', '编码监控');
  await page.waitForTimeout(500);
  const hasSub = () =>
    page.evaluate(() => [...document.querySelectorAll('.qc-subnav .qc-nav-text')].some((e) => e.textContent.trim() === '监控列表'));
  if (!(await hasSub())) {
    await clickByText(page, '.qc-nav-parent .qc-nav-text', '编码监控');
    await page.waitForTimeout(500);
  }
  console.log('subnav-open:', await hasSub());
  console.log('go-series:', await clickByText(page, '.qc-subnav .qc-nav-text', '监控列表'));
  await page.waitForTimeout(700);

  /* 首行操作列是否有「优化任务」 */
  const opLinks = await page.evaluate(() =>
    [...(document.querySelector('.table.qc-wide tbody tr .qc-op-col')?.querySelectorAll('a') ?? [])].map((e) => e.textContent.trim()),
  );
  console.log('row1-op-links:', JSON.stringify(opLinks));

  console.log('open-opt:', await clickByText(page, '.table.qc-wide tbody tr .qc-op-col a', '优化任务'));
  await page.waitForTimeout(600);

  const drawerState = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-create');
    if (!d) return { open: false };
    const types = [...d.querySelectorAll('.qc-tc-types button')].map((b) => ({ t: b.textContent.trim(), on: b.classList.contains('active') }));
    const seriesName = d.querySelector('.qc-tc-seriesname')?.textContent.trim() ?? '';
    const codeRows = d.querySelectorAll('.qc-tc-coderow').length;
    const boxes = [...d.querySelectorAll('.qc-tc-coderow input[type=checkbox]')];
    const checked = boxes.filter((b) => b.checked).length;
    const hasCycle = !!d.querySelector('.drp-trigger, .qc-date-trigger') || [...d.querySelectorAll('label')].some((l) => l.textContent.includes('优化任务周期'));
    const hasGoodsField = [...d.querySelectorAll('label')].some((l) => l.textContent.includes('关联商品'));
    const submitDisabled = d.querySelector('.drawer-foot .btn.primary')?.disabled ?? null;
    const hint = d.querySelector('.qc-tc-codehint')?.textContent.trim() ?? '';
    return { open: true, types, seriesName, codeRows, checked, boxCount: boxes.length, hasCycle, hasGoodsField, submitDisabled, hint };
  });
  console.log('drawer(系列编码优化):', JSON.stringify(drawerState));
  await page.screenshot({ path: `${OUT}/opt-series-drawer.png` });

  /* 切到 商品编码优化 */
  await clickByText(page, '.qc-tc-types button', '商品编码优化');
  await page.waitForTimeout(300);
  const afterSwitch = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-create');
    const types = [...d.querySelectorAll('.qc-tc-types button')].map((b) => ({ t: b.textContent.trim(), on: b.classList.contains('active') }));
    const label = [...d.querySelectorAll('.sg-field > label')].map((l) => l.textContent.trim());
    return { types, label };
  });
  console.log('drawer(商品编码优化):', JSON.stringify(afterSwitch));
  await page.screenshot({ path: `${OUT}/opt-code-drawer.png` });

  await browser.close();
})();
