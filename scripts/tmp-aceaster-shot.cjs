/* 验证：首页轮播彩蛋图片位 + 点击喝咖啡 toast */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);
  /* 轮播仅三张彩蛋图：切到第 2 个圆点验证切换 */
  await page.click('.ap-banner-dots button:nth-child(2)');
  await page.waitForTimeout(500);
  const dotCount = await page.locator('.ap-banner-dots button').count();
  const imgOk = await page.locator('.ap-banner-img').isVisible();
  const natural = await page.locator('.ap-banner-img').evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight }));
  await page.screenshot({ path: `${OUT}/ac-easter-banner.png`, clip: { x: 240, y: 60, width: 1100, height: 560 } });
  /* 点击图片触发彩蛋 toast */
  await page.click('.ap-banner-img');
  await page.waitForTimeout(500);
  const toastTxt = await page.locator('.toast-wrap, [class*="toast"]').first().innerText().catch(() => '');
  await page.screenshot({ path: `${OUT}/ac-easter-toast.png`, clip: { x: 240, y: 0, width: 1360, height: 400 } });
  await browser.close();
  console.log(JSON.stringify({ dotCount, imgOk, natural, toastTxt, errors }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
