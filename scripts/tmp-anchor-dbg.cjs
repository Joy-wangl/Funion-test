/* 临时调试：分区定位 tab 几何值 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  await page.click('.subnav:has-text("竞价商品")');
  await page.waitForSelector('.ops-center .page.show .bd-table');
  await page.locator('.ops-center .page.show .bd-table tbody a:has-text("详情")').first().click();
  await page.waitForSelector('.sgd-top-title');
  await page.click('.cpd-top-acts button:has-text("编辑")');
  await page.click('.cpd-side-btn:has-text("素材")');
  await page.waitForSelector('.mc-page');
  await page.screenshot({ path: 'd:/Qoder/Funion/screenshots/ops-verify-material-anchor.png' });

  const info0 = await page.evaluate(() => {
    const box = document.querySelector('.mc-left');
    const el = box && box.querySelector('[data-sec="detail"]');
    return {
      hasBox: !!box, hasEl: !!el,
      scrollHeight: box ? box.scrollHeight : -1,
      clientHeight: box ? box.clientHeight : -1,
      offsetTop: el ? el.offsetTop : -1,
      offsetParentCls: el && el.offsetParent ? el.offsetParent.className : null,
      pos: box ? getComputedStyle(box).position : null,
    };
  });
  console.log('before', JSON.stringify(info0));

  await page.locator('.mc-anchor button:has-text("详情图")').click();
  await page.waitForTimeout(800);
  const info1 = await page.evaluate(() => {
    const box = document.querySelector('.mc-left');
    const on = document.querySelector('.mc-anchor button.on');
    return { scrollTop: box ? box.scrollTop : -1, on: on ? on.textContent : null };
  });
  console.log('after', JSON.stringify(info1));
  await browser.close();
})();
