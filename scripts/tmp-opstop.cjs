/* 临时验证：运营中心头部 topbar 已移除 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ops-center .side');
  const results = {};
  results['topbar.removed'] = (await page.locator('.ops-center .ops-topbar').count()) === 0;
  results['topbar.bellGone'] = (await page.locator('.ops-center .ops-bell').count()) === 0;
  /* 内容区顶到最上：main 顶边与 ops-right 容器顶边对齐（无 topbar 占位） */
  const mainBox = await page.locator('.ops-center .main').boundingBox();
  const rightBox = await page.locator('.ops-center .ops-right').boundingBox();
  results['topbar.contentTop'] = !!mainBox && !!rightBox && Math.abs(mainBox.y - rightBox.y) < 4;
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'd:/Qoder/Funion/ops-topbar-removed.png' });
  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'OPS VERIFY OK' : `OPS VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
