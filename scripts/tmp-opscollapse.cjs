/* 临时验证：运营中心侧边栏收起状态独立，不影响其他顶部 tab */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ops-center .side');

  const results = {};

  /* 运营中心内收起 */
  await page.click('.ops-side-toggle');
  await page.waitForTimeout(200);
  results['ops.collapsed'] = (await page.locator('.ops-center .side.collapsed').count()) === 1;

  /* 切到聚合接待：其侧边栏不受影响 */
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('.rc-side');
  results['rc.notCollapsed'] = (await page.locator('.rc-side.collapsed').count()) === 0;

  /* 切回运营中心：收起态保持（独立持久化） */
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');
  results['ops.stillCollapsed'] = (await page.locator('.ops-center .side.collapsed').count()) === 1;

  /* 再切品控中心确认不受影响 */
  await page.click('.top-tabs-item:has-text("品控中心")');
  await page.waitForSelector('.qc-side');
  results['qc.notCollapsed'] = (await page.locator('.qc-side.collapsed').count()) === 0;

  /* 回运营中心展开，恢复默认 */
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side.collapsed');
  await page.click('.ops-side-toggle');
  await page.waitForTimeout(200);
  results['ops.expanded'] = (await page.locator('.ops-center .side.collapsed').count()) === 0;

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'COLLAPSE VERIFY OK' : `COLLAPSE VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
