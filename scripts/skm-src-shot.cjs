/* 京麦 商品匹配 工作区：源信息行截图（验证标题去重＋条件图上传槽已移除） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('aside');
  await page.locator('aside').getByText('商品创建', { exact: true }).first().click();
  await page.locator('aside').getByText('京麦', { exact: true }).first().click();
  await page.locator('a:visible', { hasText: /^详情$/ }).first().click();
  await page.locator('a:visible', { hasText: /^查看$/ }).first().click();
  await page.waitForSelector('.skm-view');
  await page.locator('.skm-view .skm-tab', { hasText: '商品匹配' }).click();
  await page.waitForTimeout(400);

  const info = await page.evaluate(() => {
    const src = document.querySelector('.skm-view .skm-src');
    if (!src) return null;
    return {
      hasUpload: !!src.querySelector('.skm-upload'),
      hasCondImg: !!src.querySelector('.skm-cond-img'),
      kvLabels: [...src.querySelectorAll('.skm-kv > span')].map((s) => s.textContent),
      title: (src.querySelector('.skm-src-title span') || {}).textContent,
      btns: [...src.querySelectorAll('button.sg-btn')].map((b) => b.textContent.trim()),
    };
  });
  console.log(JSON.stringify(info));

  await page.locator('.skm-view .sgd-sec').first().screenshot({ path: 'D:/PM.funion/screenshots/skm-src-jm.png' });
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
