const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const BASE = 'http://127.0.0.1:5173/';
const sideNav = (page, t) => page.evaluate((t) => { [...document.querySelectorAll('.qc-side *')].filter(e => e.children.length === 0 && e.textContent.trim() === t)[0]?.click(); }, t);
const CN = /^[一-龥]{4,7}$/;
const CODE = /^[A-Z]{3}-\d{4}$/;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const bad = [];
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { [...document.querySelectorAll('.top-tabs-item')].find(e => e.textContent.includes('品控-线上'))?.click(); });
  await page.waitForTimeout(500);

  // 系列编码（监控列表首列）
  await sideNav(page, '监控列表');
  await page.waitForSelector('.qc-center-page tbody tr td');
  await page.waitForTimeout(600);
  const seriesNames = await page.evaluate(() => [...document.querySelectorAll('.qc-center-page tbody tr')].map(tr => (tr.querySelector('td:nth-child(2) div')?.textContent || '').trim()).filter(Boolean));
  seriesNames.forEach(n => { if (!CN.test(n)) bad.push('系列编码[' + n + ']len' + n.length); });
  console.log('series sample:', seriesNames.slice(0, 6).join(' | '));

  // 展开行：商品编码 + 商品名称
  await page.evaluate(() => document.querySelector('.qc-center-page tbody tr .arrow')?.click());
  await page.waitForSelector('.qc-center-page tbody tr.expand-row');
  await page.waitForTimeout(300);
  const expText = await page.evaluate(() => document.querySelector('.qc-center-page tbody tr.expand-row')?.textContent || '');
  const codes = [...new Set(expText.match(/[A-Z]{3}-\d{4}/g) || [])];
  codes.forEach(c => { if (!CODE.test(c) || c.length !== 8) bad.push('商品编码[' + c + ']'); });
  console.log('expand codes:', codes.join(' | '));

  // 店铺商品：商品名称
  await sideNav(page, '店铺商品');
  await page.waitForSelector('.qc-sg-table tbody tr');
  await page.waitForTimeout(600);
  const goodsNames = await page.evaluate(() => [...document.querySelectorAll('.qc-sg-prod-name')].map(e => e.textContent.trim()).filter(Boolean));
  goodsNames.forEach(n => { if (n.length < 16 || n.length > 20) bad.push('商品名称[' + n + ']len' + n.length); });
  console.log('goods name sample:', goodsNames.slice(0, 4).join(' | '));
  console.log('goods name lens:', goodsNames.map(n => n.length).join(','));

  // SKU 弹窗：商品编码 + 系列编码
  await page.evaluate(() => { [...document.querySelectorAll('.qc-sg-table tbody tr a, .qc-sg-table tbody tr button, .qc-sg-table tbody tr .qc-cd-chip, .qc-sg-table tbody tr em')].find(e => e.textContent.trim() === '详')?.click(); });
  await page.waitForTimeout(600);
  const skuText = await page.evaluate(() => { const m = document.querySelector('.modal, .qc-modal, [class*=modal]'); return m ? m.textContent : ''; });
  const skuCodes = [...new Set(skuText.match(/[A-Z]{3}-\d{4}/g) || [])];
  skuCodes.forEach(c => { if (c.length !== 8) bad.push('SKU编码[' + c + ']'); });
  console.log('sku codes:', skuCodes.slice(0, 4).join(' | '));
  const skuNames = await page.evaluate(() => [...document.querySelectorAll('[class*=modal] tbody tr td:nth-child(2)')].map(td => td.textContent.trim()).filter(Boolean));
  skuNames.forEach(n => { if (n.length < 10 || n.length > 20) bad.push('SKU名称[' + n + ']len' + n.length); });
  console.log('sku name sample:', skuNames.slice(0, 4).join(' | '));
  console.log('sku name lens:', skuNames.map(n => n.length).join(','));

  console.log(bad.length ? 'SPEC FAIL:\n' + bad.slice(0, 20).join('\n') : 'SPEC PASS');
  await page.screenshot({ path: 'D:/PM.funion/screenshots/qc-spec-goods.png' });
  await browser.close();
})();
