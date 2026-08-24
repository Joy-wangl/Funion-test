/* 临时验证：详情页意见反馈入口 + 消息中心「使用者反馈」双子tab（应用评价/意见反馈） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.click('.ap-side button:has-text("全部")');
  await page.waitForSelector('.ap-grid');

  const results = {};

  /* 详情页：意见反馈按钮位于收藏左侧 */
  await page.click('.ap-grid .ap-row-name:has-text("勤劳小蜜蜂")');
  await page.waitForSelector('.ap-detail');
  const fbBtn = page.locator('.ap-detail .ap-detail-fb');
  results['detail.fbBtn'] = (await fbBtn.count()) === 1 && (await fbBtn.textContent() || '').includes('意见反馈');
  const fbBox = await fbBtn.boundingBox();
  const favBox = await page.locator('.ap-detail .ap-detail-fav').boundingBox();
  results['detail.fbLeftOfFav'] = !!fbBox && !!favBox && fbBox.x < favBox.x;
  await page.screenshot({ path: `${OUT}/vue-verify-acfb-detail.png` });

  /* 点击意见反馈：打开消息中心并定位 使用者反馈-意见反馈-当前应用 */
  await fbBtn.click();
  await page.waitForSelector('.ap-drawer-msg');
  const tabOn = await page.locator('.ap-msg-tabs button.on').textContent();
  results['drawer.tabUser'] = (tabOn || '').includes('使用者反馈');
  results['drawer.tabRenamed'] = (await page.locator('.ap-drawer-msg :text("应用反馈")').count()) === 0;
  const subOn = await page.locator('.ap-msg-subtabs button.on').textContent();
  results['drawer.subFeedbackOn'] = (subOn || '').includes('意见反馈');
  results['drawer.subBoth'] = (await page.locator('.ap-msg-subtabs button').count()) === 2;
  const railOn = await page.locator('.ap-msg-rail button.on .ap-rail-name').textContent();
  results['drawer.railCurApp'] = (railOn || '').includes('勤劳小蜜蜂');
  /* 当前应用（非 mine）无反馈：空态提示 */
  results['drawer.fbEmpty'] = (await page.locator('.ap-msg-list .ap-empty:has-text("暂无用户意见反馈")').count()) === 1;
  await page.screenshot({ path: `${OUT}/vue-verify-acfb-drawer.png` });

  /* 切到有反馈的应用（rail: 0=全部应用 1=当前 2=c-1） */
  await page.locator('.ap-msg-rail button').nth(2).click();
  await page.waitForTimeout(200);
  results['drawer.fbItems'] = (await page.locator('.ap-msg-list .ap-msg-item').count()) >= 2;

  /* 回复闭环：待回复项 -> 回复表单 -> 开发者回复 */
  await page.click('.ap-msg-list .ap-msg-item:has-text("待回复") .ap-msg-foot .ap-link');
  await page.waitForSelector('.ap-msg-replyform');
  await page.fill('.ap-msg-replyform input', '感谢建议，已纳入下个版本排期。');
  await page.click('.ap-msg-replyform button.on');
  await page.waitForTimeout(200);
  results['drawer.replyDone'] = (await page.locator('.ap-msg-list .ap-msg-reply:has-text("开发者回复")').count()) >= 1;
  results['drawer.fbStatus'] = (await page.locator('.ap-msg-list .ap-msg-st.done').count()) >= 2;

  /* 切回应用评价子tab：评价卡片（星级）正常 */
  await page.click('.ap-msg-subtabs button:has-text("应用评价")');
  await page.waitForTimeout(200);
  results['drawer.reviewCards'] = (await page.locator('.ap-msg-list .ap-msg-stars').count()) >= 1;

  await page.screenshot({ path: `${OUT}/vue-verify-acfb-review.png` });

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'ACFB VERIFY OK' : `ACFB VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
