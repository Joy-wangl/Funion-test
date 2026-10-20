/* 出图＋验证：店铺列表看板「问题类型占比」下钻小类卡点击代入问题类型/小类进二级列表 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
const BASE = 'http://127.0.0.1:5173/';

const clickCard = (page, text) =>
  page.evaluate((text) => {
    const el = [...document.querySelectorAll('.qc-sl-ov .qc-share-cards .flat-card')].find((e) => e.textContent.includes(text));
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, text);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle' });

  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.top-tabs-item')].find((x) => x.textContent.includes('品控-线上'));
    if (t) t.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const p = [...document.querySelectorAll('.qc-nav-parent')].find((x) => x.textContent.includes('店铺监控'));
    if (p) p.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const l = [...document.querySelectorAll('.qc-nav-text')].find((x) => x.textContent.trim() === '店铺列表');
    if (l) l.closest('a,button,.qc-nav')?.click();
  });
  await page.waitForTimeout(700);

  /* 大类卡点击仍为下钻 */
  console.log('drill:', await clickCard(page, '质量问题'));
  await page.waitForTimeout(500);
  console.log('drill-state:', JSON.stringify(await page.evaluate(() => ({
    title: [...document.querySelectorAll('.qc-sl-ov .qc-sec-title')].map((x) => x.textContent.trim()),
    subs: [...document.querySelectorAll('.qc-sl-ov .qc-share-cards .flat-card')].map((c) => c.textContent.trim().slice(0, 6)),
    cursor: getComputedStyle(document.querySelector('.qc-sl-ov .qc-share-cards .flat-card')).cursor,
  }))));
  await page.screenshot({ path: `${OUT}/qc-shoplist-type-drill.png` });

  /* 小类卡点击代入两级条件进二级列表 */
  console.log('carry:', await clickCard(page, '功能故障'));
  await page.waitForTimeout(700);
  console.log('list-state:', JSON.stringify(await page.evaluate(() => ({
    head: document.querySelector('.qc-as-head')?.textContent.trim(),
    board: !!document.querySelector('.qc-sl-ov'),
    labels: [...document.querySelectorAll('.sg-field > label')].map((l) => l.textContent.trim()),
    trig: [...document.querySelectorAll('.sg-field .bselect-trigger')].map((t) => t.textContent.trim()),
    rows: [...document.querySelectorAll('.qc-sl-table > tbody > tr')].filter((tr) => tr.querySelectorAll('td').length > 1)
      .map((tr) => ({
        shop: tr.querySelector('.qc-sl-shop .ss-top')?.textContent.trim(),
        hasType: [...tr.querySelectorAll('.qc-sl-types .tag')].some((t) => t.textContent.includes('质量问题')),
      })),
  }))));
  await page.screenshot({ path: `${OUT}/qc-shoplist-type-carry.png` });

  /* 返回钮还原看板快照 */
  await page.evaluate(() => document.querySelector('.qc-as-back')?.click());
  await page.waitForTimeout(600);
  console.log('back-state:', JSON.stringify(await page.evaluate(() => ({
    board: !!document.querySelector('.qc-sl-ov'),
    trig: [...document.querySelectorAll('.sg-field .bselect-trigger')].map((t) => t.textContent.trim()),
    labels: [...document.querySelectorAll('.sg-field > label')].map((l) => l.textContent.trim()),
  }))));

  await browser.close();
})();
