/* 验证：数据看板入口+二级页、我的应用间距 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  // 入口：贡献榜头部「全部数据」
  const entry = await page.locator('.ap-rank-head .ap-link').textContent();
  await page.screenshot({ path: `${OUT}/ac-dash-entry.png`, clip: { x: 0, y: 300, width: 1100, height: 600 } });

  // 进入看板
  await page.click('.ap-rank-head .ap-link');
  await page.waitForSelector('.ap-dash');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-dash.png`, fullPage: true });

  // 范围切换
  await page.click('.ap-dash-range button:has-text("近7天")');
  await page.waitForTimeout(200);
  const on7 = await page.evaluate(() => document.querySelector('.ap-dash-range button.on')?.textContent);
  await page.screenshot({ path: `${OUT}/ac-dash-7d.png`, clip: { x: 200, y: 200, width: 1200, height: 500 } });

  // TOP3 重心区
  const top3 = await page.locator('.ap-dash-top3-row').count();

  // 搜索：ERP
  await page.fill('.ap-dash-search input', 'ERP');
  await page.waitForTimeout(200);
  const rowsErp = await page.locator('.ap-dash-trow').count();
  await page.fill('.ap-dash-search input', '');
  await page.waitForTimeout(200);

  // 类目筛选：数据管理类
  await page.click('.ap-dash-cats button:has-text("数据管理类")');
  await page.waitForTimeout(200);
  const rowsCat = await page.locator('.ap-dash-trow').count();
  const cntN = await page.locator('.ap-dash-cnt').count();
  await page.screenshot({ path: `${OUT}/ac-dash-filter.png`, fullPage: true });
  await page.click('.ap-dash-cats button:has-text("全部")');
  await page.waitForTimeout(200);

  // 类目条滚动按钮：宽屏隐藏，窄屏溢出出现且可滚
  const catsNavWide = await page.locator('.ap-dash-cats-nav').count();
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.waitForTimeout(400);
  const catsNavNarrow = await page.locator('.ap-dash-cats-nav').count();
  let scrolled = false;
  if (catsNavNarrow) {
    await page.click('.ap-dash-cats-nav button[title="向右滚动"]');
    await page.waitForTimeout(600);
    scrolled = await page.evaluate(() => {
      const el = document.querySelector('.ap-dash-cats-scroll');
      return el ? el.scrollLeft > 0 : false;
    });
  }
  await page.screenshot({ path: `${OUT}/ac-dash-catsnav.png`, clip: { x: 0, y: 150, width: 1000, height: 620 } });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(300);

  // 返回首页
  await page.click('.ap-dash-head .ap-back');
  await page.waitForSelector('.ap-home-rank-row');

  // 我的应用间距
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-mine-gap.png`, clip: { x: 0, y: 60, width: 1600, height: 420 } });

  console.log(`entry=${entry} rangeOn=${on7} top3=${top3} rowsErp=${rowsErp} rowsCat=${rowsCat} cntRemoved=${cntN === 0} catsNavWide=${catsNavWide} catsNavNarrow=${catsNavNarrow} scrolled=${scrolled}`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
