const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';

const clickTab = (page, name) => page.evaluate((n) => {
  const b = [...document.querySelectorAll('.cwb-tabs button')].find((x) => x.textContent.trim() === n);
  b && b.click();
}, name);
const clickSess = (page, code) => page.evaluate((c) => {
  const el = [...document.querySelectorAll('.csw-sess-card')].find((x) => x.querySelector('.csw-sess-code')?.textContent.trim() === c);
  el && el.click();
}, code);
const optState = (page) => page.evaluate(() => {
  const badge = document.querySelector('.cwb-opt-badge');
  const metrics = [...document.querySelectorAll('.cwb-opt-metric')].map((e) => e.querySelector('.k').textContent.trim() + '=' + e.querySelector('.v').textContent.trim());
  const loose = document.querySelector('.cwb-opt-loose');
  const shop = document.querySelector('.cwb-opt-sec-t span')?.textContent.trim();
  const goods = document.querySelector('.cwb-opt-goods-score')?.textContent.trim();
  const grade = document.querySelector('.cwb-opt-goods-grade')?.textContent.trim();
  const goodsName = document.querySelector('.cwb-sec:nth-child(2) .cwb-sec-t')?.textContent.trim();
  const mines = [...document.querySelectorAll('.cwb-opt-mine')].map((e) => e.textContent.trim());
  return { badge: badge?.textContent.trim(), metrics, loose: loose ? loose.textContent.replace(/\s+/g, ' ').trim() : null, shop, goods, grade, goodsName, mines };
});

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));

  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const tabs = await page.$$eval('.cwb-tabs button', (els) => els.map((e) => e.textContent.trim()));
  console.log('TAB_ORDER', JSON.stringify(tabs));

  // default session 1 (PDD) on 优化提示
  await clickTab(page, '优化提示');
  await page.waitForTimeout(300);
  console.log('S1(PDD)', JSON.stringify(await optState(page)));
  await page.screenshot({ path: OUT + '/cwb-opt-s1-pdd.png' });

  // switch to session 3 (DY-3039, no loose, no deliver)
  await clickSess(page, '4387');
  await page.waitForTimeout(300);
  console.log('S3(DY)', JSON.stringify(await optState(page)));

  // switch to session 2 (TB-2063, loose, no deliver)
  await clickSess(page, '4069');
  await page.waitForTimeout(300);
  console.log('S2(TB)', JSON.stringify(await optState(page)));
  await page.screenshot({ path: OUT + '/cwb-opt-s2-tb.png' });

  // 商品知识 content follows session: session2 product name vs session1
  const kbName = (page) => page.evaluate(() => document.querySelector('.cwb-sku-band-name')?.textContent.trim() || document.querySelector('.cwb-kb-sec-t')?.textContent.trim());
  await clickTab(page, '商品知识');
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.cwb-dim button')].find((x) => x.textContent.includes('商品ID')); b && b.click(); });
  await page.waitForTimeout(300);
  const s2kb = await kbName(page);
  await clickSess(page, '5996');
  await page.waitForTimeout(300);
  const s1kb = await kbName(page);
  console.log('KB_S2', s2kb, '| KB_S1', s1kb, '| changed:', s2kb !== s1kb);

  // 标记会话 tagged per session
  await clickTab(page, '标记会话');
  await page.waitForTimeout(200);
  // tag in session 1
  await page.evaluate(() => { const c = document.querySelector('.cwb-cat-tag'); c && c.click(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { const s = document.querySelector('.cwb-sub'); s && s.click(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { const b = document.querySelector('.cwb-confirm'); b && b.click(); });
  await page.waitForTimeout(200);
  const taggedS1 = await page.$$eval('.cwb-tagged', (e) => e.length);
  await clickSess(page, '4069');
  await page.waitForTimeout(200);
  const taggedS2 = await page.$$eval('.cwb-tagged', (e) => e.length);
  await clickSess(page, '5996');
  await page.waitForTimeout(200);
  const taggedS1back = await page.$$eval('.cwb-tagged', (e) => e.length);
  console.log('TAGGED s1=', taggedS1, 's2=', taggedS2, 's1back=', taggedS1back);

  // active session highlight follows click
  const activeCodes = await page.$$eval('.csw-sess-card.on .csw-sess-code', (e) => e.map((x) => x.textContent.trim()));
  console.log('ACTIVE_SESS', JSON.stringify(activeCodes));

  console.log('CONSOLE_ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
  await browser.close();
})();
