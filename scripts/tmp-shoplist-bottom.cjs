/* 出图：店铺列表 底部两行新店「不计入」灰标 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
const clickByText = (page, sel, text) =>
  page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, [sel, text]);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-nav-parent .qc-nav-text', '店铺分监控');
  await page.waitForTimeout(600);
  const hasSub = () => page.evaluate(() => [...document.querySelectorAll('.qc-subnav .qc-nav-text')].some((e) => e.textContent.trim() === '店铺列表'));
  if (!(await hasSub())) { await clickByText(page, '.qc-nav-parent .qc-nav-text', '店铺分监控'); await page.waitForTimeout(500); }
  await clickByText(page, '.qc-subnav .qc-nav-text', '店铺列表');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const rows = document.querySelectorAll('.qc-sl-table tbody tr');
    rows[rows.length - 1].scrollIntoView({ block: 'end' });
  });
  await page.waitForTimeout(400);
  const grades = await page.evaluate(() => [...document.querySelectorAll('.qc-sl-grade')].map((e) => e.textContent.trim() + ':' + (e.className.includes('none') ? 'none' : 'grade')));
  console.log('grades:', JSON.stringify(grades));
  await page.screenshot({ path: `${OUT}/shop-list-bottom.png` });
  await browser.close();
})();
