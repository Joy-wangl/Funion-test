/* 临时验证：全局提示气泡化（成功深底绿图标 / 失败红底白字） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';
const BASE = process.argv[2] || 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');

  const results = {};
  const bgOf = (sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).backgroundColor);

  /* ---- 成功态：应用中心菜单触发 ---- */
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-page .ap-cats');
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForSelector('.ap-grid .ap-cell');
  await page.click('.ap-grid .ap-cell .ap-act.caret');
  await page.waitForSelector('.ap-menu');
  await page.click('.ap-menu button:has-text("权限管理")');
  await page.waitForSelector('.toast-wrap .toast.success');
  results['success.darkBg'] = (await bgOf('.toast-wrap .toast.success')) === 'rgb(32, 37, 50)';
  const sBox = await page.locator('.toast-wrap .toast.success').boundingBox();
  results['success.centered'] = !!sBox && Math.abs(sBox.x + sBox.width / 2 - 800) < 120;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-toast-success.png` });
  await page.waitForSelector('.toast-wrap .toast', { state: 'detached' });

  /* ---- 失败态：聚合接待未勾选批量转移 ---- */
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('.rc-view');
  await page.click('button:has-text("批量转移会话")');
  await page.waitForSelector('.toast-wrap .toast.error');
  results['error.redBg'] = (await bgOf('.toast-wrap .toast.error')) === 'rgb(245, 63, 63)';
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-toast-error.png` });

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'TOAST VERIFY OK' : `TOAST VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
