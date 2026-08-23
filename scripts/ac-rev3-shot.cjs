/* 验证：评价带版本号 + 每版本限评一次 + 信息网格组织架构 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

const scrollTo = (page, text) => page.evaluate((t) => {
  const main = document.querySelector('.ap-main');
  const el = [...document.querySelectorAll('.ap-detail-sub')].find((x) => x.textContent.includes(t));
  if (main && el) {
    const r = el.getBoundingClientRect();
    const m = main.getBoundingClientRect();
    main.scrollTop += r.top - m.top - 8;
  }
}, text);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForTimeout(400);

  await page.click('.ap-cell:has-text("金蝶ERP") >> nth=0');
  await page.waitForSelector('.ap-detail');
  await scrollTo(page, '评分及评论');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-rev3-ver.png` });

  // 提交一次评价 → 表单变限评提示
  await page.click('.ap-rev-pick button >> nth=3');
  await page.fill('.ap-rev-form textarea', '多账套切换很顺！');
  await page.click('.ap-rev-foot .ap-btn-blue');
  await page.waitForTimeout(400);
  await scrollTo(page, '评分及评论');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-rev3-once.png` });

  // 信息网格：组织架构
  await scrollTo(page, '信息');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-rev3-info.png` });

  await browser.close();
  console.log('ac rev3 shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
