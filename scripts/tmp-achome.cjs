/* 临时验证：应用中心首页数据恢复（相对日期种子）＋收藏/最近使用持久化＋banner 加高 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion/screenshots';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  const goHome = async () => {
    await page.click('.top-tabs-item:text-is("应用中心")');
    await page.waitForSelector('.ap-home', { timeout: 30000 });
  };

  await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('.top-tabs-item', { timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await goHome();

  /* 1. banner 加高 ≥320 */
  const box = await page.locator('.ap-banner').boundingBox();
  results['bannerH'] = !!box && box.height >= 320;
  /* 2. 上新列表恢复多条（近30天种子命中） */
  results['relList'] = (await page.locator('.ap-rel-item').count()) >= 6;
  /* 3. 贡献榜近30天有人榜数据 */
  results['rank30'] = (await page.locator('.ap-rank-person').count()) > 0;

  /* 4. 收藏＋打开 → 刷新后首页收藏/最近使用仍在 */
  await page.click('.ap-cats button:text-is("全部")');
  await page.waitForSelector('.ap-cell', { timeout: 30000 });
  /* recent 仅由卡片「打开」动作钮（act kind==='open'）记录，单元格点击走详情不记 */
  const first = page.locator('.ap-cell:has(.ap-act:text-is("打开"))').first();
  await first.hover();
  await first.locator('.ap-fav').click();
  await first.locator('.ap-act:text-is("打开")').click();
  await page.waitForTimeout(500);
  results['storeWritten'] = await page.evaluate(() => Boolean(localStorage.getItem('funion:ac:favs')) && Boolean(localStorage.getItem('funion:ac:recent')));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.top-tabs-item', { timeout: 60000 });
  await goHome();
  const favCard = page.locator('.ap-home-card:has(.ap-home-title:text("我收藏的应用"))');
  const recentCard = page.locator('.ap-home-card:has(.ap-home-title:text("最近使用"))');
  results['favPersist'] = (await favCard.locator('.ap-cell').count()) === 1;
  results['recentPersist'] = (await recentCard.locator('.ap-cell').count()) === 1;
  await page.screenshot({ path: `${OUT}/tmp-achome.png` });

  console.log(JSON.stringify(results, null, 2));
  const fail = Object.entries(results).filter(([, v]) => v !== true);
  console.log(fail.length ? `FAIL ${fail.length}: ${fail.map(([k]) => k).join(',')}` : 'ALL PASS');
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
