const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 950 } });
  page.setDefaultTimeout(60000);
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.click('.top-tabs-item:has-text("AI作图中心")');
  await page.waitForSelector('.as-wb', { timeout: 30000 });
  await page.waitForTimeout(1000);
  const html = await page.content();
  fs.writeFileSync(`${OUT}/as-debug-html.html`, html);
  await page.screenshot({ path: `${OUT}/as-debug1.png` });

  // try clicking by text
  const acts = await page.locator('.as-act').allInnerTexts();
  console.log('actions:', acts);
  const hasBtn = await page.locator('button:has-text("选择店铺商品")').count();
  console.log('choose btn count:', hasBtn);
  await page.screenshot({ path: `${OUT}/as-debug2.png`, fullPage: true });
  await browser.close();
})();
