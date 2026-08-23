/* 验证：评分及评论（平均/直方图/卡片/查看全部/提交）+ 信息网格 + 未添加不可评 */
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

  // 金蝶ERP 详情（已添加，有评论）
  await page.click('.ap-cell:has-text("金蝶ERP") >> nth=0');
  await page.waitForSelector('.ap-detail');
  await scrollTo(page, '评分及评论');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-rev2-rate.png` });

  // 查看全部
  await page.click('.ap-sec-head .ap-link');
  await page.waitForSelector('.ap-modal-lg');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-rev2-all.png` });
  await page.click('.ap-modal-lg .ap-modal-head button');
  await page.waitForTimeout(200);

  // 提交评价：5星 + 内容
  await page.click('.ap-rev-pick button >> nth=4');
  await page.fill('.ap-rev-form textarea', '多账套切换很顺，财务月结效率提升！');
  await page.click('.ap-rev-foot .ap-btn-blue');
  await page.waitForTimeout(400);
  await scrollTo(page, '评分及评论');
  await page.screenshot({ path: `${OUT}/ac-rev2-submit.png` });

  // 信息网格
  await scrollTo(page, '信息');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-rev2-info.png` });

  // 未添加应用：海贼王ERP → 提示不可评
  await page.click('.ap-detail .ap-back');
  await page.waitForTimeout(300);
  await page.click('.ap-cell:has-text("海贼王ERP") >> nth=0');
  await page.waitForSelector('.ap-detail');
  await scrollTo(page, '评分及评论');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-rev2-noadd.png` });

  await browser.close();
  console.log('ac rev2 shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
