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
    const body = [...document.querySelectorAll('.cwb-body')].find(b => b.querySelector('.cwb-sku-col'));
    const skuCol = document.querySelector('.cwb-body .cwb-sku-col');
    const r = skuCol ? skuCol.getBoundingClientRect() : null;
    return {
      dimSwitcher: !!document.querySelector('.cwb-dim'),
      inertTemplateInBody: !!document.querySelector('.cwb-body template:not([v-if]):not([v-else])') || [...document.querySelectorAll('.cwb-body > template')].length > 0,
      kbVisible: !!body,
      skuColRect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      secs: body ? [...body.querySelectorAll('.cwb-kb-sec-t')].map(e => e.textContent.trim().split('\n')[0]) : [],
      skuThumbs: body ? body.querySelectorAll('.cwb-sku-thumb').length : 0,
      codeChips: body ? [...body.querySelectorAll('.cwb-code-chip')].map(c => c.querySelector('b')?.textContent) : [],
    };
  });
  console.log('KB-STATE', JSON.stringify(state));
  await page.screenshot({ path: `${OUT}/cwb-kb-single-dim.png` });
  // 编辑 → 保存 round trip
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-kb-foot button')].find(x => x.textContent.includes('编辑'));
    b && b.click();
  });
  await page.waitForTimeout(300);
  const editState = await page.evaluate(() => {
    const body = [...document.querySelectorAll('.cwb-body')].find(b => b.querySelector('.cwb-sku-col'));
    return {
      skuInputs: body ? body.querySelectorAll('.cwb-sku-band input').length : 0,
      baseInputs: body ? body.querySelectorAll('.cwb-base-inp').length : 0,
      footBtns: [...document.querySelectorAll('.cwb-kb-foot button')].map(b => b.textContent.trim()),
    };
  });
  console.log('KB-EDIT', JSON.stringify(editState));
  await page.screenshot({ path: `${OUT}/cwb-kb-single-dim-edit.png` });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-kb-foot button')].find(x => x.textContent.includes('保存'));
    b && b.click();
  });
  await page.waitForTimeout(300);
  const afterSave = await page.evaluate(() => [...document.querySelectorAll('.cwb-kb-foot button')].map(b => b.textContent.trim()));
  console.log('KB-AFTER-SAVE', JSON.stringify(afterSave));
  console.log('CONSOLE-ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
  await browser.close();
})();
