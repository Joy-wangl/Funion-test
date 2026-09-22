/* 验证：评价申诉列表卡删除自创标题条，列头即卡片首行；导出入口移至筛选行按钮组且可点击反馈 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  console.log('URL:', page.url(), 'tabs:', await page.locator('.top-tabs-item').count());
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  /* 申诉中心分组默认收起时才展开；子项为 .subnav */
  if (!(await page.locator('.subnav:has-text("评价申诉")').first().isVisible().catch(() => false))) {
    await page.click('.nav-text:has-text("申诉中心")');
  }
  await page.click('.subnav:has-text("评价申诉")');
  await page.waitForSelector('.ra-table:visible');

  results['ra.noTitleStrip'] = (await page.locator('.ra-table-top').count()) === 0;
  /* 列表卡首行即列头 */
  results['ra.theadFirst'] = (await page.locator('.ra-table-card > :first-child').evaluate((el) => el.className)) === 'ra-table-wrap';
  /* 导出按钮在筛选行按钮组，位于重置左侧 */
  const acts = await page.locator('.ra-filter-actions button').allTextContents();
  results['ra.exportInFilterRow'] = acts.join(',') === '全部导出,重置,查询';

  await page.locator('.ra-filter-actions button', { hasText: '全部导出' }).click();
  await page.waitForTimeout(600);
  results['ra.exportToast'] = (await page.locator('body').textContent()).includes('已导出 6 条评价');

  await page.locator('.ra-table-card').screenshot({ path: `${OUT}/tmp-ratablehead.png` });
  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
