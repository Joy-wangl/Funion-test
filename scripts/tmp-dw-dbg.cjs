/* 临时调试：AI画图 商品图片分组布局 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("蜜蜂插件")');
  await page.waitForSelector('.bee-mitem');
  await page.click('.bee-mitem:has-text("任务管理")');
  await page.waitForSelector('.bee-welcome');
  await page.click('.bee-welcome button:has-text("钉钉扫码登录")');
  await page.waitForSelector('.bee-login .bl-card');
  await page.click('.bl-btn');
  await page.waitForSelector('.bee-dialog .bp-table');
  await page.click('.bee-dialog .bp-close');
  await page.click('.bee-mitem:has-text("AI图库")');
  await page.waitForSelector('.ail-acct');
  await page.fill('.ail-acct input >> nth=0', 'ai-demo');
  await page.fill('.ail-acct input >> nth=1', 'ai123456');
  await page.click('.ail-acct .bl-btn');
  await page.waitForSelector('.dw-wrap');
  await page.click('.dw-side button:has-text("我的商品")');
  await page.waitForSelector('.dw-pick-list');
  await page.click('.dw-pick-row >> nth=0');
  await page.waitForSelector('.dw-g-grid img');
  const info = await page.evaluate(() => {
    const g = document.querySelector('.dw-g-grid');
    const img = document.querySelector('.dw-g-grid img');
    const cs = g ? getComputedStyle(g) : null;
    const ci = img ? getComputedStyle(img) : null;
    return {
      display: cs && cs.display,
      cols: cs && cs.gridTemplateColumns,
      gWidth: g && g.getBoundingClientRect().width,
      imgWidth: img && img.getBoundingClientRect().width,
      imgHeight: img && img.getBoundingClientRect().height,
      aspect: ci && ci.aspectRatio,
    };
  });
  console.log(JSON.stringify(info));
  await browser.close();
})();
