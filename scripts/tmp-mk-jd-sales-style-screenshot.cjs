/* 截图：市场商机 › 竞店商品 › 店铺商品 › 销量涨幅列新样式 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const path = require('path');
const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const cdpScreenshot = async (page, file) => {
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  await cdp.detach();
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });

  await page.goto('http://127.0.0.1:5173/#ops-center', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ops-center', { timeout: 60000 });

  /* 进入市场商机 */
  await page.click('.ops-center .side .subnav:has-text("市场商机")');
  await page.waitForSelector('.mk-page');

  /* 竞店商品 tab */
  await page.click('.mk2-tab:has-text("竞店商品")');
  await page.waitForSelector('.mk-jd-pane');

  /* 店铺商品子 tab */
  await page.click('.mk2-subtab:has-text("店铺商品")');
  await page.waitForFunction(() => document.querySelectorAll('.mk-jd-table tbody tr').length > 0);

  /* 截图展示销量涨幅列新样式 */
  await cdpScreenshot(page, path.join(OUT, 'mk-jd-goods-sales-style.png'));

  await browser.close();
  console.log('Screenshot saved: mk-jd-goods-sales-style.png');
})().catch((e) => { console.error(e); process.exit(1); });
