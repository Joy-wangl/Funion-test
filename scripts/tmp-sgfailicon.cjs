/* 验证：审核未通过标签内 ⓘ icon 不再露白底（background 应为 transparent，继承标签红底） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  await page.click('.nav-text:has-text("店铺商品")');
  await page.waitForSelector('.sg-page:visible .sg-failtag');

  const tag = page.locator('.sg-page:visible .sg-failtag').first();
  const icon = tag.locator('.sg-fail-i');
  results['sgfail.iconTransparent'] = (await icon.evaluate((el) => getComputedStyle(el).backgroundColor)) === 'rgba(0, 0, 0, 0)';
  results['sgfail.tagRedBg'] = (await tag.evaluate((el) => getComputedStyle(el).backgroundColor)) === 'rgb(255, 243, 243)';
  await tag.screenshot({ path: `${OUT}/tmp-sgfailtag.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
