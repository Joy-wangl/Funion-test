const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const actions = ['一键全素材', '换主题', '换主体', '换场景', '单图复刻', '商品主图', '详情图', '抠白底图', '选区抠图', '选区清除杂物'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 950 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.setDefaultTimeout(60000);
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.click('.top-tabs-item:has-text("AI作图中心")');
  await page.waitForSelector('.as-wb', { timeout: 30000 });

  for (const a of actions) {
    await page.locator('.as-act').filter({ hasText: a }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/as-smoke-${a.replace(/[:\/]/g, '')}.png` });
    console.log(a, 'errors so far:', errors.length);
  }

  console.log('total errors:', errors);
  await browser.close();
})();
