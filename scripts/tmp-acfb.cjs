/* 临时验证：详情页意见反馈＝提交入口（四分类抽屉）+ 消息中心查看/回复闭环 */
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

  /* 先从消息中心「查看应用」进入我的应用详情（消息中心只收自己应用的反馈，闭环需在我的应用上提交） */
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
  await page.click('.ap-msg-subtabs button:has-text("意见反馈")');
  await page.waitForTimeout(200);
  await page.click('.ap-msg-list .ap-msg-item .ap-msg-top-act .ap-link:has-text("查看应用")');
  await page.waitForSelector('.ap-detail');
  const fbBtn = page.locator('.ap-detail .ap-detail-fb');
  results['detail.fbBtn'] = (await fbBtn.count()) === 1 && (await fbBtn.textContent() || '').includes('意见反馈');
  const fbBox = await fbBtn.boundingBox();
  const favBox = await page.locator('.ap-detail .ap-detail-fav').boundingBox();
  results['detail.fbLeftOfFav'] = !!fbBox && !!favBox && fbBox.x < favBox.x;
  results['vis.detailPub'] = (await page.locator('.ap-detail-sub .ap-vis.pub:has-text("公开")').count()) === 1;

  /* 点击意见反馈：打开提交抽屉（与系统反馈同构：四分类 + 内容 + 配图） */
  await fbBtn.click();
  await page.waitForSelector('.ap-drawer .ap-fb-types');
  results['form.fourTypes'] = (await page.locator('.ap-drawer .ap-fb-types button').allTextContents()).join(',') === '体验反馈,BUG反馈,优化反馈,新需求提交';
  results['form.privTag'] = (await page.locator('.ap-drawer-head .ap-vis.priv:has-text("隐私")').count()) === 1;
  results['form.defaultOn'] = ((await page.locator('.ap-drawer .ap-fb-types button.on').textContent()) || '').includes('体验反馈');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-acfb-form.png` });
  /* 空内容拦截 */
  await page.click('.ap-drawer-foot button:has-text("提交反馈")');
  await page.waitForTimeout(200);
  results['form.emptyBlock'] = (await page.locator('.ap-drawer .ap-fb-types').count()) === 1;
  /* 选 BUG反馈 + 填内容 + 提交 */
  await page.click('.ap-drawer .ap-fb-types button:has-text("BUG反馈")');
  await page.fill('.ap-drawer .ap-fb-input', '灵感库页面切换时偶尔卡死，请排查。');
  await page.click('.ap-drawer-foot button:has-text("提交反馈")');
  await page.waitForTimeout(300);
  results['form.closeAfterSubmit'] = (await page.locator('.ap-drawer .ap-fb-types').count()) === 0;
  results['form.toast'] = (await page.locator(':text("反馈已提交")').count()) >= 1;

  /* 消息中心：意见反馈子tab 新反馈置顶，带分类标签与待回复状态 */
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
  const tabOn = await page.locator('.ap-msg-tabs button.on').textContent();
  results['drawer.tabUser'] = (tabOn || '').includes('使用者反馈');
  results['drawer.tabRenamed'] = (await page.locator('.ap-drawer-msg :text("应用反馈")').count()) === 0;
  await page.click('.ap-msg-subtabs button:has-text("意见反馈")');
  await page.waitForTimeout(200);
  results['drawer.subBoth'] = (await page.locator('.ap-msg-subtabs button').count()) === 2;
  results['vis.subTabs'] =
    (await page.locator('.ap-msg-subtabs .ap-vis.pub:has-text("公开")').count()) === 1 &&
    (await page.locator('.ap-msg-subtabs .ap-vis.priv:has-text("隐私")').count()) === 1;
  const firstCard = page.locator('.ap-msg-list .ap-msg-item').first();
  const firstText = (await firstCard.textContent()) || '';
  results['drawer.newFirst'] = firstText.includes('七妮妮') && firstText.includes('BUG反馈') && firstText.includes('灵感库页面切换时偶尔卡死');
  results['drawer.newPending'] = (await firstCard.locator('.ap-msg-st.pending').count()) === 1;
  results['vis.fbPriv'] = (await page.locator('.ap-msg-list .ap-msg-item .ap-vis.priv').count()) >= 1;
  results['vis.fbTypeTags'] = (await page.locator('.ap-msg-list .ap-fb-type').count()) >= 3;
  await page.screenshot({ path: `${OUT}/vue-verify-acfb-drawer.png` });

  /* 回复闭环：回复新反馈（支持配图上传） */
  await firstCard.locator('.ap-msg-foot .ap-link').click();
  await page.waitForSelector('.ap-msg-replyform');
  await page.fill('.ap-msg-replyform .ap-rf-row input', '已收到，卡顿原因排查中，下个版本修复。');
  const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await page.locator('.ap-msg-replyform input[type="file"]').setInputFiles({ name: 'reply.png', mimeType: 'image/png', buffer: Buffer.from(PNG_B64, 'base64') });
  await page.waitForSelector('.ap-msg-replyform .ap-rev-thumb');
  results['reply.upload'] = (await page.locator('.ap-msg-replyform .ap-rev-thumb').count()) === 1;
  await page.click('.ap-msg-replyform button.on');
  await page.waitForTimeout(200);
  results['drawer.replyDone'] = (await page.locator('.ap-msg-list .ap-msg-reply:has-text("开发者回复")').count()) >= 1;
  results['reply.imgShown'] = (await firstCard.locator('.ap-msg-reply .ap-rev-imgs img').count()) === 1;

  /* 切回应用评价子tab：评价卡片（星级）正常 */
  await page.click('.ap-msg-subtabs button:has-text("应用评价")');
  await page.waitForTimeout(200);
  results['drawer.reviewCards'] = (await page.locator('.ap-msg-list .ap-msg-stars').count()) >= 1;
  results['vis.reviewPub'] = (await page.locator('.ap-msg-list .ap-msg-item .ap-vis.pub').count()) >= 1;

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
