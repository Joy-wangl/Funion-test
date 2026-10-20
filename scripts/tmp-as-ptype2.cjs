/* 调试：问题小类选择是否生效（读 trigger 回显与查询后总数） */
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
  const trigOf = (lab) => page.evaluate((t) => {
    const f = [...document.querySelectorAll('.qc-as-filter .sg-field')].find((x) => x.querySelector('label')?.textContent.trim() === t);
    return f?.querySelector('.bselect-trigger')?.textContent.trim();
  }, lab);
  const open = async (lab) => {
    await page.evaluate((t) => {
      const f = [...document.querySelectorAll('.qc-as-filter .sg-field')].find((x) => x.querySelector('label')?.textContent.trim() === t);
      f?.querySelector('.bselect-trigger')?.click();
    }, lab);
    await page.waitForTimeout(350);
  };
  const pick = async (val) => {
    await page.evaluate((v) => { [...document.querySelectorAll('.bselect-menu .bselect-opt')].find((o) => o.textContent.trim() === v)?.click(); }, val);
    await page.waitForTimeout(300);
  };
  const query = async () => {
    await page.evaluate(() => { [...document.querySelectorAll('.qc-as-filter .sg-btn.primary')].find((b) => b.textContent.includes('查询'))?.click(); });
    await page.waitForTimeout(1800);
  };
  const total = () => page.evaluate(() => document.querySelector('.ib-pageinfo')?.textContent.trim());
  const out = {};
  out.t0 = await total();
  await open('问题类型'); await pick('少发'); await query();
  out.tType = await total();
  out.trigSubBefore = await trigOf('问题小类');
  await open('问题小类');
  out.subMenu = await page.evaluate(() => [...document.querySelectorAll('.bselect-menu .bselect-opt')].map((o) => o.textContent.trim()));
  await pick('缺件漏发');
  out.trigSubAfter = await trigOf('问题小类');
  await query();
  out.tSub = await total();
  out.errs = errs;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
