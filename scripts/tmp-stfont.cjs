/* 验证：策略表状态列字号降档至次级行同层（12px），名称主行保持 13px */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://localhost:5173/#ops-center', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.ops-center', { timeout: 90000 });
  await page.getByText('商品策略', { exact: true }).first().click();
  await page.waitForSelector('.st-table tbody tr', { timeout: 30000 });

  const sizes = await page.evaluate(() => {
    const fs1 = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).fontSize : null; };
    return {
      status: fs1('.st-table .sg-status'),
      kv: fs1('.st-table .st-kv'),
      name: fs1('.st-table .st-name'),
    };
  });
  const results = [
    `${sizes.status === '12px' ? 'PASS' : 'FAIL'} status = 12px (got ${sizes.status})`,
    `${sizes.kv === '12px' ? 'PASS' : 'FAIL'} st-kv = 12px (got ${sizes.kv})`,
    `${sizes.name === '14px' ? 'PASS' : 'FAIL'} st-name = 14px (got ${sizes.name})`,
    `${errs.length === 0 ? 'PASS' : 'FAIL'} console errors = 0`,
  ];
  await page.screenshot({ path: `${OUT}/st-font-align.png` });
  console.log(results.join('\n'));
  await browser.close();
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();
