/* 验证：策略表单页已删除「宝贝类型」与「其它信息（发货时效）」整区 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  /* 商品策略可能为直连导航项或分组子项，按可见性二选一 */
  const sub = page.locator('.subnav:has-text("商品策略")').first();
  if (await sub.isVisible().catch(() => false)) {
    await sub.click();
  } else {
    await page.click('.nav-text:has-text("商品策略")');
  }
  await page.waitForSelector('.sg-card:visible');
  await page.click('button:has-text("新建策略")');
  await page.waitForSelector('.st-form-page:visible');

  const txt = await page.locator('.st-form-page').textContent();
  results['st.noItemType'] = !txt.includes('宝贝类型');
  results['st.noOtherSec'] = !txt.includes('其它信息');
  results['st.noShipTime'] = !txt.includes('发货时效');
  results['st.pricingKept'] = txt.includes('SKU定价方式');
  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
