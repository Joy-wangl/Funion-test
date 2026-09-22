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
console.log('nav', await clickLeaf('运营管理'));
await page.waitForTimeout(900);
await page.screenshot({ path: OUT + '/om-list.png', fullPage: true });
const condOpened = await page.evaluate(() => {
  const trig = [...document.querySelectorAll('.id-cond .bselect-trigger')].find((b) => b.textContent.trim() === '出仓利润');
  if (trig) { trig.click(); return true; }
  return false;
});
await page.waitForTimeout(400);
const optClicked = await page.evaluate(() => {
  const opt = [...document.querySelectorAll('.bselect-opt')].find((o) => o.textContent.trim() === '出仓利润介于' && o.offsetParent !== null);
  if (opt) { opt.click(); return true; }
  return false;
});
await page.waitForTimeout(400);
console.log('cond', condOpened, optClicked);
const grid = await page.locator('.id-grid').boundingBox();
await page.screenshot({ path: OUT + '/om-cond.png', clip: grid });
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.title === '管理列表字段');
  if (b) b.click();
});
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '/om-colpop.png' });
await page.mouse.click(400, 500);
await page.waitForTimeout(300);
console.log('detail', await page.evaluate(() => {
  const els = [...document.querySelectorAll('a')].filter((a) => a.textContent.trim() === '商品详情' && a.offsetParent !== null);
  if (els[0]) { els[0].click(); return els.length; }
  return 0;
}));
await page.waitForTimeout(800);
await page.screenshot({ path: OUT + '/om-detail.png', fullPage: true });
await browser.close();
console.log('shots done');
