import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion/public/prd-shots';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'commit' });
await page.waitForTimeout(3500);
const clickLeaf = (t) => page.evaluate((txt) => {
  const el = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && e.textContent.trim() === txt && e.offsetParent !== null);
  if (el) { el.click(); return true; }
  return false;
}, t);
console.log('nav', await clickLeaf('运营驾驶舱'));
await page.waitForTimeout(900);
await page.screenshot({ path: OUT + '/dc-goods-view.png', fullPage: true });
/* 自定义区间日历展开 */
console.log('cal', await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '自定义ⓘ');
  if (b) { b.click(); return true; }
  return false;
}));
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '/dc-goods-cal.png' });
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '自定义ⓘ');
  if (b) b.click();
});
await page.waitForTimeout(300);
/* 列表模式 */
const pickBubble = (from, to) => page.evaluate(([f, t]) => {
  const trig = [...document.querySelectorAll('.bselect-trigger')].find((b) => b.textContent.trim() === f && b.offsetParent !== null);
  if (!trig) return 'no-trigger';
  trig.click();
  return new Promise((res) => setTimeout(() => {
    const opt = [...document.querySelectorAll('.bselect-opt')].find((o) => o.textContent.trim() === t && o.offsetParent !== null);
    if (!opt) { res('no-opt'); return; }
    opt.click();
    res('ok');
  }, 300));
}, [from, to]);
console.log('list', await pickBubble('视图模式', '列表模式'));
await page.waitForTimeout(500);
await page.screenshot({ path: OUT + '/dc-goods-list.png', fullPage: true });
/* 对比模式 */
console.log('cmp', await pickBubble('列表模式', '对比模式'));
await page.waitForTimeout(500);
await page.screenshot({ path: OUT + '/dc-goods-cmp.png', fullPage: true });
/* 回视图模式 + 趋势弹窗 */
console.log('view', await pickBubble('对比模式', '视图模式'));
await page.waitForTimeout(400);
console.log('kpi', await page.evaluate(() => {
  const c = document.querySelector('.kpis .kpi');
  if (c) { c.click(); return true; }
  return false;
}));
await page.waitForTimeout(500);
await page.screenshot({ path: OUT + '/dc-goods-trend.png' });
await page.evaluate(() => { const b = document.querySelector('.trend-close'); if (b) b.click(); });
await page.waitForTimeout(300);
/* 亏损/缺货表：元素级截图，避免 clip 坐标越界 */
await page.locator('.dashboard-lists').screenshot({ path: OUT + '/dc-goods-loss.png' });
console.log('stock', await clickLeaf('缺货商品'));
await page.waitForTimeout(400);
await page.locator('.dashboard-lists').screenshot({ path: OUT + '/dc-goods-stock.png' });
await browser.close();
console.log('shots done');
