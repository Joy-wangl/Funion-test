/* 验证：新优化类型种子数据闭环
   ① 待办任务类型页签出现 系列编码优化/商品编码优化，点入有对应卡片；
   ② 我发起 点卡片开详情抽屉，类型为对应新类型；
   ③ 店铺商品新增 优化中 标签（TD-010/TD-011 挂载），点 优化任务 开详情抽屉类型正确。 */
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

const openGroup = async (page, parentText, leafText) => {
  const hasLeaf = () =>
    page.evaluate((lt) => [...document.querySelectorAll('.qc-subnav .qc-nav-text')].some((e) => e.textContent.trim() === lt), leafText);
  if (!(await hasLeaf())) {
    await clickByText(page, '.qc-nav-parent .qc-nav-text', parentText);
    await page.waitForTimeout(400);
  }
  return hasLeaf();
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  console.log('top-tab:', await clickByText(page, '.top-tabs-item', '品控-线上'));
  await page.waitForTimeout(600);
  console.log('online-shell:', await page.evaluate(() => !![...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '待办任务')));

  /* ① 待办任务 类型页签 */
  console.log('go-todo:', await clickByText(page, '.qc-nav-text', '待办任务'));
  await page.waitForTimeout(700);
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll('.tc-typerow .tc-typeitem')].filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim()),
  );
  console.log('visible-type-tabs:', JSON.stringify(tabs));

  console.log('tab-series:', await clickByText(page, '.tc-typerow .tc-typeitem', '系列编码优化'));
  await page.waitForTimeout(400);
  const seriesCards = await page.evaluate(() =>
    [...document.querySelectorAll('.qc-todo-card .td-title')].map((e) => e.textContent.trim()),
  );
  console.log('cards(系列编码优化):', JSON.stringify(seriesCards));

  console.log('tab-code:', await clickByText(page, '.tc-typerow .tc-typeitem', '商品编码优化'));
  await page.waitForTimeout(400);
  const codeCards = await page.evaluate(() =>
    [...document.querySelectorAll('.qc-todo-card .td-title')].map((e) => e.textContent.trim()),
  );
  console.log('cards(商品编码优化):', JSON.stringify(codeCards));
  await page.screenshot({ path: `${OUT}/opt-todo-tabs.png` });

  /* ② 我发起 → 点卡片开详情 */
  console.log('pill-mine:', await clickByText(page, '.qc-todo-pill, .tc-pill, button', '我发起的'));
  await page.waitForTimeout(400);
  console.log('tab-series2:', await clickByText(page, '.tc-typerow .tc-typeitem', '系列编码优化'));
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.qc-todo-card')?.click());
  await page.waitForTimeout(500);
  const detailType = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-detail-drawer');
    return d ? d.textContent.slice(0, 400) : 'no-drawer';
  });
  console.log('detail-has-系列编码优化:', String(detailType).includes('系列编码优化'));
  await page.screenshot({ path: `${OUT}/opt-todo-detail.png` });

  /* ③ 店铺商品 优化中 标签 + 优化任务详情 */
  await page.evaluate(() => document.querySelector('.qc-todo-detail-drawer .x, .qc-todo-detail-drawer [class*=close]')?.click());
  await page.waitForTimeout(300);
  console.log('group-open:', await openGroup(page, '店铺监控', '店铺商品'));
  console.log('go-goods:', await clickByText(page, '.qc-subnav .qc-nav-text', '店铺商品'));
  await page.waitForTimeout(700);
  const optTags = await page.evaluate(() =>
    [...document.querySelectorAll('.qc-sg-opttag')].map((e) => e.textContent.trim()),
  );
  console.log('opttag-count:', optTags.length, JSON.stringify(optTags));
  /* 点第一个 优化任务（优化中态）开详情抽屉 */
  const opened = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.qc-op-col a')].filter((a) => a.textContent.trim() === '优化任务');
    if (!links.length) return 'no-link';
    links[0].click();
    return 'ok:' + links.length;
  });
  console.log('open-detail:', opened);
  await page.waitForTimeout(500);
  const d2 = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-detail-drawer');
    return d ? d.textContent.slice(0, 300) : 'no-drawer';
  });
  console.log('goods-detail-snippet:', String(d2).slice(0, 120));
  await page.screenshot({ path: `${OUT}/opt-goods-detail.png` });

  await browser.close();
})();
