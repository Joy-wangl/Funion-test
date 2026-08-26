/* 临时验证：侧边栏「个人商品库」改回「商品创建」 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');

  results['nav.renamed'] = (await page.locator('.nav-parent:has-text("商品创建")').count()) === 1;
  results['nav.oldGone'] = (await page.locator('.nav-parent:has-text("个人商品库")').count()) === 0;

  /* 展开分组后子项可切页 */
  await page.click('.nav-parent:has-text("商品创建")');
  await page.click('.subnav:has-text("淘宝")');
  await page.waitForSelector('.ops-center .page.show tbody tr');
  results['sub.page'] = true;

  await page.screenshot({ path: `${OUT}/ops-verify-rename2.png` });
  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
