const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';
const IMG = 'D:/PM.funion/screenshots/cwb-opt-tab.png';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));

  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // go to 商品知识, ID dim, edit state
  await page.evaluate(() => { const b = [...document.querySelectorAll('.cwb-tabs button')].find((x) => x.textContent.trim() === '商品知识'); b && b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.cwb-dim button')].find((x) => x.textContent.includes('商品ID')); b && b.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.cwb-kb-foot-btn')].find((x) => x.textContent.trim() === '编辑'); b && b.click(); });
  await page.waitForTimeout(300);

  const addTiles = await page.$$eval('.cwb-media.add', (e) => e.length);
  console.log('ADD_TILES(id dim, edit)', addTiles);

  // count image tiles in 图片信息 row before
  const imgTilesBefore = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('.cwb-kb-sec')].find((s) => s.querySelector('.cwb-kb-sec-t')?.textContent.trim() === '图片信息');
    return sec ? sec.querySelectorAll('.cwb-media:not(.add)').length : -1;
  });

  // click first 新增 (图片信息)
  await page.evaluate(() => { const t = document.querySelector('.cwb-media.add'); t && t.click(); });
  await page.waitForTimeout(300);
  const modalTitle = await page.$eval('.m-title', (e) => e.textContent.trim()).catch(() => 'NONE');
  console.log('MODAL_TITLE(img)', modalTitle);
  await page.screenshot({ path: OUT + '/cwb-add-modal-empty.png' });

  // set file on hidden input
  await page.setInputFiles('.modal-body input[type=file]', IMG);
  await page.waitForTimeout(400);
  const hasPrev = await page.$('.cwb-add-prev') !== null;
  const fname = await page.$eval('.cwb-add-name', (e) => e.textContent.trim()).catch(() => 'NONE');
  console.log('PREVIEW', hasPrev, fname);
  await page.screenshot({ path: OUT + '/cwb-add-modal-picked.png' });

  // confirm
  await page.evaluate(() => { const b = [...document.querySelectorAll('.modal-foot button')].find((x) => x.textContent.trim() === '确认'); b && b.click(); });
  await page.waitForTimeout(400);
  const modalGone = await page.$('.cwb-add-drop') === null;
  const imgTilesAfter = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('.cwb-kb-sec')].find((s) => s.querySelector('.cwb-kb-sec-t')?.textContent.trim() === '图片信息');
    return sec ? sec.querySelectorAll('.cwb-media:not(.add)').length : -1;
  });
  console.log('MODAL_GONE', modalGone, 'IMG_TILES', imgTilesBefore, '->', imgTilesAfter);
  await page.screenshot({ path: OUT + '/cwb-add-added.png' });

  // open 商品视频 新增 (second add tile) -> title 新增视频 then cancel
  await page.evaluate(() => { const t = document.querySelectorAll('.cwb-media.add')[1]; t && t.click(); });
  await page.waitForTimeout(300);
  const vidTitle = await page.$eval('.m-title', (e) => e.textContent.trim()).catch(() => 'NONE');
  console.log('MODAL_TITLE(video)', vidTitle);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.modal-foot button')].find((x) => x.textContent.trim() === '取消'); b && b.click(); });
  await page.waitForTimeout(300);
  console.log('VIDEO_MODAL_GONE', await page.$('.cwb-add-drop') === null);

  console.log('CONSOLE_ERRORS', errs.length, JSON.stringify(errs.slice(0, 5)));
  await browser.close();
})();
