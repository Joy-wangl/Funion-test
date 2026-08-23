/* 验证：消息中心（应用渠道回复 + 系统开发者回复）+ 详情页开发者回复闭环 */
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

  // 侧边栏铃铛入口（含角标）
  await page.screenshot({ path: `${OUT}/ac-msg-bell.png`, clip: { x: 0, y: 800, width: 280, height: 100 } });

  // 打开消息中心（默认应用渠道）
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-msg-tabs');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-msg-app.png` });

  // 回复一条未回复的评价
  await page.click('.ap-msg-item:has-text("期待更多模板") .ap-msg-foot .ap-link');
  await page.waitForTimeout(200);
  await page.fill('.ap-msg-replyform input', '模板库已在规划中，敬请期待！');
  await page.click('.ap-msg-replyform button.on');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-msg-replied.png` });

  // 系统开发者 tab
  await page.click('.ap-msg-tabs button:has-text("系统开发者")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-msg-sys.png` });

  // 回复待处理反馈
  await page.click('.ap-msg-item:has-text("一键展开所有人的应用") .ap-msg-foot .ap-link');
  await page.waitForTimeout(200);
  await page.fill('.ap-msg-replyform input', '已采纳：一键展开能力排入迭代，感谢建议！');
  await page.click('.ap-msg-replyform button.on');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-msg-sys-replied.png` });

  // 关弹窗，进我的创作第一个应用详情看开发者回复
  await page.click('.ap-modal-lg .ap-modal-head button');
  await page.waitForTimeout(200);
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.click('.ap-grid.mine .ap-cell >> nth=0');
  await page.waitForSelector('.ap-detail');
  await page.waitForTimeout(300);
  await scrollTo(page, '评分及评论');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-msg-detail.png` });

  await browser.close();
  console.log('ac msg shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
