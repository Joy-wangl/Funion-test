/* 临时验证：意见反馈＝对非我的且已添加的应用提交 + 消息中心类型筛选（待回复/已回复下方）+ 回复闭环 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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

  /* 他人未添加应用：入口禁用 + 提示添加后可反馈 */
  await page.click('.ap-cell:has-text("小蜜蜂A")');
  await page.waitForSelector('.ap-detail');
  const fbBtn = page.locator('.ap-detail .ap-detail-fb');
  results['gate.notMineShown'] = (await fbBtn.count()) === 1;
  results['gate.disabledBeforeAdd'] = await fbBtn.isDisabled();
  results['gate.addHint'] = ((await fbBtn.getAttribute('title')) || '').includes('添加应用后可提交意见反馈');
  results['gate.addBtn'] = ((await page.locator('.ap-detail-actions .ap-btn-solid').textContent()) || '').trim() === '添加';
  const fbBox = await fbBtn.boundingBox();
  const favBox = await page.locator('.ap-detail .ap-detail-fav').boundingBox();
  results['detail.fbLeftOfFav'] = !!fbBox && !!favBox && fbBox.x < favBox.x;

  /* 添加后解锁：提交抽屉四分类 + 空内容拦截 + 提交 */
  await page.click('.ap-detail-actions .ap-btn-solid');
  await page.waitForTimeout(1300);
  results['gate.enabledAfterAdd'] = !(await fbBtn.isDisabled());
  await fbBtn.click();
  await page.waitForSelector('.ap-drawer .ap-fb-types');
  results['form.fourTypes'] = (await page.locator('.ap-drawer .ap-fb-types button').allTextContents()).join(',') === '体验反馈,BUG反馈,优化反馈,新需求提交';
  results['form.privTag'] = (await page.locator('.ap-drawer-head .ap-vis.priv:has-text("隐私")').count()) === 1;
  results['form.defaultOn'] = ((await page.locator('.ap-drawer .ap-fb-types button.on').textContent()) || '').includes('体验反馈');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-acfb-form.png` });
  await page.click('.ap-drawer-foot button:has-text("提交反馈")');
  await page.waitForTimeout(200);
  results['form.emptyBlock'] = (await page.locator('.ap-drawer .ap-fb-types').count()) === 1;
  await page.click('.ap-drawer .ap-fb-types button:has-text("BUG反馈")');
  await page.fill('.ap-drawer .ap-fb-input', '希望支持深色模式，夜间巡店更护眼。');
  await page.click('.ap-drawer-foot button:has-text("提交反馈")');
  await page.waitForTimeout(300);
  results['form.closeAfterSubmit'] = (await page.locator('.ap-drawer .ap-fb-types').count()) === 0;
  results['form.toast'] = (await page.locator(':text("反馈已提交")').count()) >= 1;

  /* 消息中心-意见反馈：类型筛选行（待回复/已回复下方，与提交四分类一致） */
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
  await page.click('.ap-msg-subtabs button:has-text("意见反馈")');
  await page.waitForTimeout(200);
  results['filter.rowTypes'] = (await page.locator('.ap-msg-af-types button').allTextContents()).join(',') === '全部,体验反馈,BUG反馈,优化反馈,新需求提交';
  results['filter.belowStatus'] = !!(await page.locator('.ap-msg-filter .ap-fb-tabs + .ap-msg-af-types').count());
  results['filter.defaultAll'] = ((await page.locator('.ap-msg-af-types button.on').textContent()) || '').trim() === '全部';
  /* 提交到他人应用的反馈不进我的收件箱 */
  results['inbox.notMine'] = !((await page.locator('.ap-msg-list').textContent()) || '').includes('深色模式');
  /* 类型筛选生效：新需求提交 */
  await page.click('.ap-msg-af-types button:has-text("新需求提交")');
  await page.waitForTimeout(200);
  const tagTexts = await page.locator('.ap-msg-list .ap-fb-type').allTextContents();
  results['filter.byType'] = tagTexts.length >= 2 && tagTexts.every((t) => t === '新需求提交');
  await page.click('.ap-msg-af-types button:has-text("全部")');
  await page.waitForTimeout(200);
  results['vis.fbTypeTags'] = (await page.locator('.ap-msg-list .ap-fb-type').count()) >= 3;
  await page.screenshot({ path: `${OUT}/vue-verify-acfb-drawer.png` });

  /* 回复闭环：首条待回复（支持配图上传） */
  const pendingCard = page.locator('.ap-msg-list .ap-msg-item', { has: page.locator('.ap-msg-st.pending') }).first();
  await pendingCard.locator('.ap-msg-foot .ap-link').click();
  await page.waitForSelector('.ap-msg-replyform');
  await page.fill('.ap-msg-replyform .ap-rf-row input', '已收到，该能力在排期中，预计下个版本上线。');
  await page.locator('.ap-msg-replyform input[type="file"]').setInputFiles({ name: 'reply.png', mimeType: 'image/png', buffer: Buffer.from(PNG_B64, 'base64') });
  await page.waitForSelector('.ap-msg-replyform .ap-rev-thumb');
  results['reply.upload'] = (await page.locator('.ap-msg-replyform .ap-rev-thumb').count()) === 1;
  await page.click('.ap-msg-replyform button.on');
  await page.waitForTimeout(200);
  results['drawer.replyDone'] = (await page.locator('.ap-msg-list .ap-msg-reply:has-text("开发者回复")').count()) >= 1;
  const repliedCard = page.locator('.ap-msg-list .ap-msg-item', { hasText: '已收到，该能力在排期中' }).first();
  results['reply.imgShown'] = (await repliedCard.locator('.ap-msg-reply .ap-rev-imgs img').count()) === 1;

  /* 我的应用详情：无意见反馈入口 */
  await page.locator('.ap-msg-list .ap-msg-item').first().locator('.ap-msg-top-act .ap-link:has-text("查看应用")').click();
  await page.waitForSelector('.ap-detail');
  results['gate.mineHidden'] = (await page.locator('.ap-detail .ap-detail-fb').count()) === 0;
  results['vis.detailPub'] = (await page.locator('.ap-detail-sub .ap-vis.pub:has-text("公开")').count()) === 1;

  /* 切回应用评价子tab：评价卡片（星级）正常 */
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
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
