/* 京麦详情右侧操作栏：高度跟随内容＋短渐变分隔线 截图验收 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('aside');
  await page.locator('aside').getByText('商品创建', { exact: true }).first().click();
  await page.locator('aside').getByText('京麦', { exact: true }).first().click();
  await page.locator('a:visible', { hasText: /^详情$/ }).first().click();
  const rail = page.locator('.cpd-side-acts:visible').first();
  await rail.waitFor();
  await page.waitForTimeout(300);
  const box = await rail.boundingBox();
  await page.screenshot({
    path: 'D:/PM.funion/screenshots/side-acts-jm.png',
    clip: { x: box.x - 240, y: Math.max(0, box.y - 40), width: box.width + 280, height: box.height + 80 },
  });
  console.log(JSON.stringify({ railHeight: box.height }));
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
