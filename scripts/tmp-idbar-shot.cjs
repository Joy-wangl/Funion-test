/* 验证/出图：宝贝ID 条形标签展示框 mock 截图 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 568, height: 1010 } });
  await page.goto('file:///d:/Qoder/Funion/scripts/tmp-idbar-mock.html');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/id-bar-mock.png`, fullPage: true });
  await browser.close();
  console.log('id bar mock shot ok');
})().catch((e) => { console.error(e); process.exit(1); });
