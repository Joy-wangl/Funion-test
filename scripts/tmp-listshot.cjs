/* 截图：商品创建列表（平台 LOGO 徽章/侧栏 subnav LOGO/标题链接同宽/详芯片居中） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForSelector('.top-tabs-item', { timeout: 60000 });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  if (!(await page.locator('.subnav:text-is("淘宝")').first().isVisible().catch(() => false))) {
    await page.click('.nav-text:has-text("商品创建")');
  }
  await page.click('.subnav:text-is("淘宝")');
  await page.waitForSelector('section.page.show .create-table:visible');
  await page.screenshot({ path: 'd:/Qoder/Funion/screenshots/tmp-listlogo.png' });
  await browser.close();
  console.log('shot ok');
})().catch((e) => { console.error(e); process.exit(1); });
