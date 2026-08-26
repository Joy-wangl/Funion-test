/* 临时验证：侧边栏「商品创建」改名「个人商品库」 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');

  results['nav.new'] = (await page.locator('.ops-center .nav-text', { hasText: '个人商品库' }).count()) === 1;
  results['nav.oldGone'] = (await page.locator('.ops-center .nav-text', { hasText: '商品创建' }).count()) === 0;

  /* 子项点击仍正常切页 */
  await page.click('.ops-center .nav-parent:has-text("个人商品库")');
  await page.click('.ops-center .subnav:has-text("淘宝")');
  await page.waitForTimeout(300);
  results['sub.taobao'] = (await page.locator('.ops-center .create-product-title').count()) >= 1;
  await page.screenshot({ path: `${OUT}/ops-verify-rename.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
