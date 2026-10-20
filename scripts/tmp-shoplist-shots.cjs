/* 出图：店铺分监控 子路由（数据概览 / 店铺列表）+ 趋势图 / 创建任务 弹窗 */
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

  /* ① 数据概览（父级点击即进入，同时可能收起子菜单 → 再点一次展开） */
  await clickByText(page, '.qc-nav-parent .qc-nav-text', '店铺分监控');
  await page.waitForTimeout(600);
  const hasSub = () =>
    page.evaluate(() => [...document.querySelectorAll('.qc-subnav .qc-nav-text')].some((e) => e.textContent.trim() === '店铺列表'));
  if (!(await hasSub())) {
    await clickByText(page, '.qc-nav-parent .qc-nav-text', '店铺分监控');
    await page.waitForTimeout(500);
  }
  console.log('subnav-open:', await hasSub());
  await page.screenshot({ path: `${OUT}/shop-score-board.png` });

  /* ② 店铺列表 */
  console.log('go-list:', await clickByText(page, '.qc-subnav .qc-nav-text', '店铺列表'));
  await page.waitForTimeout(700);
  const cols = await page.evaluate(() => ({
    th: [...document.querySelectorAll('.qc-sl-table thead th')].map((e) => e.textContent.trim()),
    rows: document.querySelectorAll('.qc-sl-table tbody tr').length,
    firstRow: [...(document.querySelector('.qc-sl-table tbody tr')?.querySelectorAll('td') ?? [])].map((e) => e.textContent.trim()),
    dots: document.querySelectorAll('.qc-sl-plat i').length,
  }));
  console.log('cols:', JSON.stringify(cols));
  await page.screenshot({ path: `${OUT}/shop-list.png` });

  /* ③ 趋势图弹窗（含悬浮取值卡） */
  console.log('open-trend:', await clickByText(page, '.qc-sl-op', '趋势图'));
  await page.waitForTimeout(600);
  const box = await page.evaluate(() => {
    const el = document.querySelector('.qc-sl-tpanel');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (box) await page.mouse.move(box.x + box.w * 0.45, box.y + box.h * 0.5);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/shop-list-trend.png` });
  await clickByText(page, '.modal-foot .btn', '关闭');
  await page.waitForTimeout(400);

  /* ④ 创建任务弹窗（默认维度=拉分主因） */
  console.log('open-task:', await clickByText(page, '.qc-sl-op', '创建任务'));
  await page.waitForTimeout(600);
  const taskForm = await page.evaluate(() => ({
    dim: document.querySelector('.opt-form .sg-select, .opt-form .sg-value')?.textContent.trim() ?? '',
    name: document.querySelector('.opt-form .sg-input')?.value ?? '',
  }));
  console.log('task-form:', JSON.stringify(taskForm));
  await page.screenshot({ path: `${OUT}/shop-list-task.png` });

  /* 保存 → 任务 chip 落表 */
  await clickByText(page, '.modal-foot .btn.primary', '保存');
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => [...document.querySelectorAll('.qc-sl-table tbody tr:first-child .qc-sl-task')].map((e) => e.textContent.trim()));
  console.log('row1-tasks-after:', JSON.stringify(after));
  await page.screenshot({ path: `${OUT}/shop-list-after-task.png` });

  await browser.close();
})();
