/* 验证：店铺商品「创建任务/优化任务」→ 商品优化（只读类型芯片、关联商品必填、无编码清单） */
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
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-nav-parent .qc-nav-text', '店铺监控');
  await page.waitForTimeout(500);
  const hasSub = () => page.evaluate(() => [...document.querySelectorAll('.qc-subnav .qc-nav-text')].some((e) => e.textContent.trim() === '店铺商品'));
  if (!(await hasSub())) { await clickByText(page, '.qc-nav-parent .qc-nav-text', '店铺监控'); await page.waitForTimeout(500); }
  console.log('go-goods:', await clickByText(page, '.qc-subnav .qc-nav-text', '店铺商品'));
  await page.waitForTimeout(700);

  /* 找一个非「优化任务」态（即「创建任务」）的行入口，点开抽屉 */
  const opened = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.qc-op-col a')].filter((a) => a.textContent.trim() === '创建任务');
    if (!links.length) return 'no-create-link';
    links[0].click();
    return 'ok';
  });
  console.log('open-goods-opt:', opened);
  await page.waitForTimeout(600);

  const st = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-create');
    if (!d) return { open: false };
    const chip = d.querySelector('.qc-tc-typechip')?.textContent.trim() ?? '';
    const hasSeg = !!d.querySelector('.qc-tc-types');
    const labels = [...d.querySelectorAll('.sg-field > label')].map((l) => l.textContent.trim());
    const goodsReq = labels.some((l) => l.startsWith('关联商品') && l.includes('*'));
    const hasCodeList = !!d.querySelector('.qc-tc-coderow');
    const chips = d.querySelectorAll('.qc-tc-chip').length;
    return { open: true, chip, hasSeg, goodsReq, hasCodeList, presetChips: chips };
  });
  console.log('drawer(商品优化):', JSON.stringify(st));
  await page.screenshot({ path: `${OUT}/opt-goods-drawer.png` });
  await browser.close();
})();
