/* 售后数据列表：问题类型+级联小类查询条件、列表列展示问题类型 验证 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.qc-nav-text')].find((n) => n.textContent.trim() === '售后数据')?.click(); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.flat-card')].find((c) => (c.getAttribute('title') ?? '').includes('单量最高的售后类型'))?.click(); });
  await page.waitForTimeout(900);
  const out = {};
  out.labels = await page.evaluate(() => [...document.querySelectorAll('.qc-as-filter .sg-field label')].map((l) => l.textContent.trim()));
  const openField = async (lab) => {
    await page.evaluate(() => { document.querySelector('.qc-body')?.click(); });
    await page.waitForTimeout(200);
    await page.evaluate((t) => {
      const f = [...document.querySelectorAll('.qc-as-filter .sg-field')].find((x) => x.querySelector('label')?.textContent.trim() === t);
      f?.querySelector('.bselect-trigger')?.click();
    }, lab);
    await page.waitForTimeout(350);
    return page.evaluate(() => [...document.querySelectorAll('.bselect-menu .bselect-opt')].map((o) => o.textContent.trim()));
  };
  const pick = async (val) => {
    await page.evaluate((v) => { [...document.querySelectorAll('.bselect-menu .bselect-opt')].find((o) => o.textContent.trim() === v)?.click(); }, val);
    await page.waitForTimeout(250);
  };
  out.typeOpts = await openField('问题类型');
  await pick('少发');
  out.subOptsAfterType = await openField('问题小类');
  await pick('全部小类');
  await page.evaluate(() => { [...document.querySelectorAll('.qc-as-filter .sg-btn.primary')].find((b) => b.textContent.includes('查询'))?.click(); });
  await page.waitForTimeout(1500);
  out.head = await page.evaluate(() => [...document.querySelectorAll('.ao-table thead th')].map((t) => t.textContent.trim()));
  out.colVals = await page.evaluate(() => {
    const idx = [...document.querySelectorAll('.ao-table thead th')].findIndex((t) => t.textContent.trim() === '问题类型');
    return [...document.querySelectorAll('.ao-table tbody tr')].slice(0, 20).map((r) => r.children[idx]?.textContent.trim());
  });
  out.total = await page.evaluate(() => document.querySelector('.ib-pageinfo')?.textContent.trim());
  await page.screenshot({ path: 'D:/PM.funion/screenshots/after-ptype-col.png' });
  /* 级联小类筛选：少发+缺件漏发 */
  await openField('问题小类');
  await pick('缺件漏发');
  await page.evaluate(() => { [...document.querySelectorAll('.qc-as-filter .sg-btn.primary')].find((b) => b.textContent.includes('查询'))?.click(); });
  await page.waitForTimeout(1500);
  out.subTotal = await page.evaluate(() => document.querySelector('.ib-pageinfo')?.textContent.trim());
  out.subColVals = await page.evaluate(() => {
    const idx = [...document.querySelectorAll('.ao-table thead th')].findIndex((t) => t.textContent.trim() === '问题类型');
    return [...new Set([...document.querySelectorAll('.ao-table tbody tr')].map((r) => r.children[idx]?.textContent.trim()))];
  });
  out.errs = errs;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
