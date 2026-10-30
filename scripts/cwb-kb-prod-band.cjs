const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-tabs button')].find(x => x.textContent.includes('商品知识'));
    b && b.click();
  });
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => {
    const main = document.querySelector('.cwb-id-main');
    const band = main?.querySelector('.cwb-sku-band');
    const br = band?.getBoundingClientRect();
    const secs = main ? [...main.querySelectorAll(':scope > .cwb-kb-sec > .cwb-kb-sec-t')].map(e => e.textContent.trim().split('\n')[0]) : [];
    const skuSec = main ? [...main.querySelectorAll(':scope > .cwb-kb-sec')].find(s => s.querySelector('.cwb-kb-sec-t')?.textContent.includes('SKU信息')) : null;
    return {
      bandRect: br ? { w: Math.round(br.width), h: Math.round(br.height) } : null,
      bandName: band?.querySelector('.cwb-sku-band-name')?.textContent.trim(),
      bandNameEllipsis: band ? getComputedStyle(band.querySelector('.cwb-sku-band-name')).textOverflow : null,
      bandMetrics: band ? [...band.querySelectorAll('.cwb-sku-band-m')].map(m => m.textContent.trim()) : [],
      secOrder: secs,
      skuCells: skuSec ? [...skuSec.querySelectorAll('.cwb-base-cell')].map(c => c.textContent.trim().replace(/\s+/g, ' ')) : [],
      skuSecRect: skuSec ? (() => { const r = skuSec.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })() : null,
    };
  });
  console.log('KB-PROD', JSON.stringify(state));
  await page.screenshot({ path: `${OUT}/cwb-kb-prod-band.png` });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-kb-foot button')].find(x => x.textContent.includes('编辑'));
    b && b.click();
  });
  await page.waitForTimeout(300);
  const editState = await page.evaluate(() => {
    const main = document.querySelector('.cwb-id-main');
    const skuSec = [...main.querySelectorAll(':scope > .cwb-kb-sec')].find(s => s.querySelector('.cwb-kb-sec-t')?.textContent.includes('SKU信息'));
    return {
      skuInputs: skuSec ? skuSec.querySelectorAll('input').length : 0,
      skuSecBtns: skuSec ? [...skuSec.querySelectorAll('.cwb-kb-sec-t button')].map(b => b.textContent.trim()) : [],
      baseInputs: main.querySelectorAll('.cwb-base-inp').length,
    };
  });
  console.log('KB-PROD-EDIT', JSON.stringify(editState));
  await page.screenshot({ path: `${OUT}/cwb-kb-prod-band-edit.png` });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-kb-foot button')].find(x => x.textContent.includes('保存'));
    b && b.click();
  });
  await page.waitForTimeout(300);
  console.log('KB-PROD-AFTER-SAVE', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.cwb-kb-foot button')].map(b => b.textContent.trim()))));
  console.log('CONSOLE-ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
  await browser.close();
})();
