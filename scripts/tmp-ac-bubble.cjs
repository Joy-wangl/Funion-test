/* 临时验证：应用中心微动作气泡（收藏/添加/打开）+ 全局 toast 居中修复 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';
const BASE = process.argv[2] || 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-page .ap-cats');
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForSelector('.ap-grid .ap-cell');

  const results = {};

  /* ---- 收藏：气泡锚在星标的上方，而非全局 toast ---- */
  await page.click('.ap-grid .ap-cell .ap-fav');
  await page.waitForSelector('.ap-bubble');
  const favText = await page.textContent('.ap-bubble');
  const favBox = await page.locator('.ap-bubble').boundingBox();
  const starBox = await page.locator('.ap-grid .ap-cell .ap-fav').first().boundingBox();
  results['fav.bubbleText'] = (favText ?? '').includes('已收藏，可在首页查看');
  results['fav.bubbleNearStar'] = !!favBox && !!starBox && Math.abs(favBox.x + favBox.width / 2 - (starBox.x + starBox.width / 2)) < 40 && favBox.y < starBox.y;
  results['fav.noGlobalToast'] = (await page.locator('.toast-wrap .toast').count()) === 0;
  await page.screenshot({ path: `${OUT}/vue-verify-ac-bubble.png` });

  /* 取消收藏气泡 */
  await page.waitForSelector('.ap-bubble', { state: 'detached' });
  await page.click('.ap-grid .ap-cell .ap-fav');
  await page.waitForSelector('.ap-bubble');
  results['fav.unfavBubble'] = ((await page.textContent('.ap-bubble')) ?? '').includes('已取消收藏');
  await page.waitForSelector('.ap-bubble', { state: 'detached' });

  /* ---- 添加：加载完成后原位气泡 ---- */
  const addBtn = page.locator('.ap-grid .ap-cell .ap-act', { hasText: '添加' }).first();
  const addBox = await addBtn.boundingBox();
  await addBtn.click();
  await page.waitForTimeout(1100);
  const addBubbleBox = await page.locator('.ap-bubble').boundingBox();
  results['add.bubbleAfterLoad'] = !!addBubbleBox && ((await page.textContent('.ap-bubble')) ?? '').includes('已添加');
  results['add.bubbleAtAnchor'] = !!addBubbleBox && !!addBox && Math.abs(addBubbleBox.x + addBubbleBox.width / 2 - (addBox.x + addBox.width / 2)) < 40;
  await page.waitForSelector('.ap-bubble', { state: 'detached' });

  /* ---- 全局 toast：仍走 toast 的提示应居中显示（不再裸渲染到页边） ---- */
  await page.click('.ap-grid .ap-cell .ap-act.caret');
  await page.waitForSelector('.ap-menu');
  await page.click('.ap-menu button:has-text("权限管理")');
  await page.waitForSelector('.toast-wrap .toast');
  const tBox = await page.locator('.toast-wrap .toast').boundingBox();
  results['toast.centered'] = !!tBox && Math.abs(tBox.x + tBox.width / 2 - 800) < 120 && tBox.y < 200;
  await page.screenshot({ path: `${OUT}/vue-verify-ac-toast.png` });

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'AC VERIFY OK' : `AC VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
