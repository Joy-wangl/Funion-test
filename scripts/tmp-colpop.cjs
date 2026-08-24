/* 临时验证：运营管理 ▦ 按钮 = 列表字段管理气泡（勾选列显隐） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';
const BASE = process.argv[2] || 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("运营中心")');
  await page.click('.ops-center .nav-text:has-text("运营管理")');
  await page.waitForSelector('.om-page .ib-table');

  const results = {};
  const thCount0 = await page.locator('.om-page .ib-table thead th').count();
  results['table.full15Cols'] = thCount0 === 15;

  // 打开列管理气泡
  await page.click('.om-page .id-btn.icon');
  await page.waitForSelector('.om-col-pop');
  results['pop.opens'] = true;
  results['pop.items11'] = (await page.locator('.om-col-pop .om-col-item').count()) === 11;
  results['pop.allChecked'] = (await page.locator('.om-col-pop .om-col-item input:checked').count()) === 11;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-colpop.png` });

  // 取消「退款率」→ 列隐藏，其余列仍在
  await page.click('.om-col-pop .om-col-item:text-is("退款率")');
  await page.waitForTimeout(100);
  results['col.refundHidden'] = (await page.locator('.om-page .ib-table th:text-is("退款率")').count()) === 0;
  results['col.refundAfterKept'] = (await page.locator('.om-page .ib-table th:text-is("发货后退款率")').count()) === 1;
  results['col.thCount14'] = (await page.locator('.om-page .ib-table thead th').count()) === thCount0 - 1;
  results['btn.activeOn'] = (await page.locator('.om-page .id-btn.icon.on').count()) === 1;

  // 再取消「创建时间」→ 13 列
  await page.click('.om-col-pop .om-col-item:text-is("创建时间")');
  await page.waitForTimeout(100);
  results['col.createdHidden'] = (await page.locator('.om-page .ib-table th:text-is("创建时间")').count()) === 0;
  await page.screenshot({ path: `${OUT}/vue-verify-colpop-hidden.png` });

  // 勾回 → 恢复 15 列，按钮激活态解除
  await page.click('.om-col-pop .om-col-item:text-is("退款率")');
  await page.click('.om-col-pop .om-col-item:text-is("创建时间")');
  await page.waitForTimeout(100);
  results['col.restored15'] = (await page.locator('.om-page .ib-table thead th').count()) === 15;
  results['btn.activeOff'] = (await page.locator('.om-page .id-btn.icon.on').count()) === 0;

  // 点外部关闭气泡
  await page.mouse.click(800, 900);
  await page.waitForTimeout(100);
  results['pop.closesOutside'] = (await page.locator('.om-col-pop').count()) === 0;

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'COLPOP VERIFY OK' : `COLPOP VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
