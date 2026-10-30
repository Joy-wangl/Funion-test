/* 临时截图：商机中心 → 竞店商品（竞店任务 / 店铺商品 双 tab） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
const TAG = process.argv[2] || 'jd';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 950 } });
  page.setDefaultTimeout(60000);
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  await page.click('.subnav:has-text("市场商机")');
  await page.waitForSelector('.ops-center .page.show .mk2-seg');
  await page.click('.ops-center .page.show .mk2-tab:has-text("竞店商品")');
  await page.waitForTimeout(700);

  const info = await page.evaluate(() => {
    const pageEl = document.querySelector('.ops-center .page.show');
    const subs = Array.from(pageEl.querySelectorAll('.mk2-subseg .mk2-subtab')).map((el) => el.textContent.trim());
    const cards = Array.from(pageEl.querySelectorAll('.sg-card')).map((c) => Math.round(c.getBoundingClientRect().height));
    const rows = document.querySelectorAll('.ops-center .page.show .sg-table tbody tr').length;
    return { subs, cards, rows, scrollH: pageEl.scrollHeight };
  });
  console.log('JD-SHOT', JSON.stringify(info));

  await page.screenshot({ path: `${OUT}/${TAG}-jd-task.png` });

  await page.click('.ops-center .page.show .mk2-subseg .mk2-subtab:has-text("店铺商品")');
  await page.waitForTimeout(600);
  const info2 = await page.evaluate(() => {
    const pageEl = document.querySelector('.ops-center .page.show');
    const cards = Array.from(pageEl.querySelectorAll('.sg-card')).map((c) => Math.round(c.getBoundingClientRect().height));
    return { cards, rows: pageEl.querySelectorAll('.sg-table tbody tr').length, scrollH: pageEl.scrollHeight };
  });
  console.log('JD-SHOT GOODS', JSON.stringify(info2));
  await page.screenshot({ path: `${OUT}/${TAG}-jd-goods.png` });

  await page.evaluate(() => {
    const el = document.querySelector('.app-content');
    if (el) el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${TAG}-jd-goods-bottom.png` });

  console.log('JD-SHOT DONE');
  await browser.close();
})();
