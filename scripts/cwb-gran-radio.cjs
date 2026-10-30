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
    const b = [...document.querySelectorAll('.cwb-tabs button')].find(x => x.textContent.includes('标记会话'));
    b && b.click();
  });
  await page.waitForTimeout(400);
  const readGran = () => page.evaluate(() => {
    const gran = document.querySelector('.cwb-gran');
    const grp = document.querySelector('.cwb-code-group');
    const gr = grp ? grp.getBoundingClientRect() : null;
    return {
      btns: gran ? [...gran.querySelectorAll('button')].map(b => ({ t: b.textContent.trim(), on: b.classList.contains('on') })) : [],
      chipsVisible: gr ? gr.width > 0 && gr.height > 0 : false,
      chips: grp ? [...grp.querySelectorAll('.cwb-code-tag')].map(c => ({ t: c.textContent.trim().slice(0, 6), on: c.classList.contains('on') })) : [],
    };
  });
  console.log('INIT', JSON.stringify(await readGran()));
  await page.screenshot({ path: `${OUT}/cwb-gran-radio-code.png` });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-gran button')].find(x => x.textContent.trim() === '当前订单');
    b && b.click();
  });
  await page.waitForTimeout(300);
  console.log('ORDER', JSON.stringify(await readGran()));
  await page.screenshot({ path: `${OUT}/cwb-gran-radio-order.png` });
  // tag with order target
  await page.evaluate(() => { const c = [...document.querySelectorAll('.cwb-cat-tag')][0]; c && c.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const s = [...document.querySelectorAll('.cwb-sub')][0]; s && s.click(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.cwb-confirm')][0]; b && b.click(); });
  await page.waitForTimeout(300);
  console.log('TAG-ORDER', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.cwb-tagged')].map(t => t.textContent.trim().replace(/\s+/g, ' ')))));
  // back to code
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cwb-gran button')].find(x => x.textContent.trim() === '商品编码');
    b && b.click();
  });
  await page.waitForTimeout(300);
  console.log('BACK-CODE', JSON.stringify(await readGran()));
  console.log('CONSOLE-ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
  await browser.close();
})();
