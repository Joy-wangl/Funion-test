/* 临时截图：驾驶舱工具栏区域 */
const fs = require('fs');
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1800, height: 900 } });
  await p.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await p.click('.top-tabs-item:has-text("智能运营中心")');
  await p.waitForSelector('.ops-center');
  await p.click('.ops-center .nav-text:has-text("运营驾驶舱")');
  await p.waitForSelector('.dash-toolbar');
  await p.waitForTimeout(300);
  const el = p.locator('.page.show .dash-toolbar');
  await el.screenshot({ path: OUT + '/ops-dash-toolbar.png' });
  await p.screenshot({ path: OUT + '/ops-dash-full.png' });
  await b.close();
  console.log('SHOT OK');
})();
