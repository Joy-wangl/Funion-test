/* 临时截图：素材中心左栏详情图区域 */
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
  await p.click('.subnav:has-text("竞价商品")');
  await p.waitForSelector('.ops-center .page.show .bd-table');
  await p.locator('.ops-center .page.show .bd-table tbody a:has-text("详情")').first().click();
  await p.waitForSelector('.sgd-top-title');
  await p.click('.cpd-top-acts button:has-text("编辑")');
  await p.click('.cpd-side-btn:has-text("素材")');
  await p.waitForSelector('.mc-page');
  await p.locator('.mc-left').evaluate((el) => {
    const t = [...el.querySelectorAll('.mc-sec-title')].find((x) => x.textContent.includes('详情图'));
    el.scrollTo({ top: t.offsetTop - 60 });
  });
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/ops-verify-material-detail.png' });
  await b.close();
  console.log('SHOT OK');
})();
