/* 验证：发布到抽屉按路由平台过滤——淘宝/视频号/京麦各只展示本平台策略与店铺 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');

  const gotoRoute = async (name) => {
    if (!(await page.locator(`.subnav:text-is("${name}")`).first().isVisible().catch(() => false))) {
      await page.click('.nav-text:has-text("商品创建")');
    }
    await page.click(`.subnav:text-is("${name}")`);
    await page.waitForSelector('section.page.show .create-table:visible');
  };
  const openPub = async () => {
    await page.locator('section.page.show a:has-text("发布到")').locator('visible=true').first().click();
    await page.waitForSelector('.cp-pub-drawer');
  };
  const stratNames = () => page.locator('.cp-pub-drawer .cp-pub-strat b').allTextContents();
  const step2 = async (strat) => {
    await page.locator(`.cp-pub-strat:has-text("${strat}")`).click();
    await page.locator('.cp-pub-drawer button:has-text("下一步")').click();
    await page.locator('.cp-pub-caret').first().click();
    await page.waitForSelector('.cp-pub-shop:visible');
  };
  const shopPlats = () => page.locator('.cp-pub-shop:visible .plat').allTextContents();
  const closePub = () => page.locator('.cp-drawer-mask').click({ position: { x: 5, y: 5 } });

  /* 淘宝路由：策略 13245/8801，店铺平台默认淘宝、列表全淘宝店 */
  await gotoRoute('淘宝');
  await openPub();
  results['tb.strats'] = JSON.stringify(await stratNames()) === JSON.stringify(['13245', '8801', '不使用策略发布']);
  await step2('13245');
  results['tb.plat'] = (await page.locator('.cp-pub-plat').textContent()).includes('淘宝');
  const tbPlats = await shopPlats();
  results['tb.shops'] = tbPlats.length === 14 && tbPlats.every((p) => p === '淘宝');
  await closePub();

  /* 视频号路由：仅视频号策略 6603，店铺平台视频号、3 家视频号店 */
  await gotoRoute('视频号');
  await openPub();
  results['video.strats'] = JSON.stringify(await stratNames()) === JSON.stringify(['6603', '不使用策略发布']);
  await step2('6603');
  results['video.plat'] = (await page.locator('.cp-pub-plat').textContent()).includes('视频号');
  const vPlats = await shopPlats();
  results['video.shops'] = vPlats.length === 3 && vPlats.every((p) => p === '视频号');
  await page.screenshot({ path: `${OUT}/tmp-pubplat-video.png` });
  await closePub();

  /* 京麦路由：仅京麦策略 5508，店铺平台京麦、2 家京麦店、jd logo */
  await gotoRoute('京麦');
  await openPub();
  results['jm.strats'] = JSON.stringify(await stratNames()) === JSON.stringify(['5508', '不使用策略发布']);
  await step2('5508');
  results['jm.plat'] = (await page.locator('.cp-pub-plat').textContent()).includes('京麦');
  const jPlats = await shopPlats();
  results['jm.shops'] = jPlats.length === 2 && jPlats.every((p) => p === '京麦');
  results['jm.logo'] = (await page.locator('.cp-pub-shop:visible img').first().getAttribute('src')) === '/logos/jd.png';
  await page.screenshot({ path: `${OUT}/tmp-pubplat-jm.png` });
  await closePub();

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
