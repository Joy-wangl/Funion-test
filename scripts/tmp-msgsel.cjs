/* 临时验证：消息中心回复状态筛选改下拉（置于子 tab 行右端） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
  await page.waitForTimeout(300);

  /* 旧分段控件移除，下拉出现在子 tab 行 */
  results['old.removed'] = (await page.locator('.ap-msg-filter .ap-fb-tabs').count()) === 0;
  results['row.select'] = (await page.locator('.ap-msg-filter-row .ap-msg-status-select').count()) === 1;
  results['row.defaultAll'] = ((await page.locator('.ap-msg-status-select .bselect-text').textContent()) || '').trim() === '全部';

  /* 位置：与子 tab 同行、右端对齐 */
  const selBox = await page.locator('.ap-msg-status-select').boundingBox();
  const filterBox = await page.locator('.ap-msg-filter').boundingBox();
  const subBtnBox = await page.locator('.ap-msg-subtabs button').first().boundingBox();
  results['pos.rightEdge'] = !!selBox && !!filterBox && Math.abs(selBox.x + selBox.width - (filterBox.x + filterBox.width)) < 40;
  results['pos.sameLine'] = !!selBox && !!subBtnBox && Math.abs(selBox.y + selBox.height / 2 - (subBtnBox.y + subBtnBox.height / 2)) < 20;
  await page.screenshot({ path: `${OUT}/vue-verify-msgsel-app.png` });

  /* 下拉选项与筛选联动（应用评价） */
  const countItems = async () => page.locator('.ap-msg-list .ap-msg-item').count();
  const nAll = await countItems();
  await page.click('.ap-msg-status-select .bselect-trigger');
  await page.waitForSelector('.bselect-menu');
  results['menu.options'] = ((await page.locator('.bselect-menu .bselect-opt').allTextContents()).map((s) => s.replace('✓', '').trim()).join(',')) === '全部,待回复,已回复';
  await page.click('.bselect-menu .bselect-opt:has-text("待回复")');
  await page.waitForTimeout(200);
  const nPending = await countItems();
  results['pick.pendingText'] = ((await page.locator('.ap-msg-status-select .bselect-text').textContent()) || '').trim() === '待回复';
  await page.click('.ap-msg-status-select .bselect-trigger');
  await page.waitForSelector('.bselect-menu');
  await page.click('.bselect-menu .bselect-opt:has-text("已回复")');
  await page.waitForTimeout(200);
  const nDone = await countItems();
  results['pick.doneText'] = ((await page.locator('.ap-msg-status-select .bselect-text').textContent()) || '').trim() === '已回复';
  results['filter.split'] = nPending + nDone === nAll && nAll > 0;

  /* 意见反馈子 tab：下拉仍在，类型筛选行保留 */
  await page.click('.ap-msg-subtabs button:has-text("意见反馈")');
  await page.waitForTimeout(200);
  results['fb.selectKept'] = (await page.locator('.ap-msg-filter-row .ap-msg-status-select').count()) === 1;
  results['fb.typeRow'] = (await page.locator('.ap-msg-af-types').count()) === 1;
  await page.screenshot({ path: `${OUT}/vue-verify-msgsel-fb.png` });

  /* 系统反馈 tab：下拉仍展示 */
  await page.click('.ap-msg-tabs button:has-text("系统反馈")');
  await page.waitForTimeout(200);
  results['sys.select'] = (await page.locator('.ap-msg-filter-row .ap-msg-status-select').count()) === 1;
  results['sys.noSubtabs'] = (await page.locator('.ap-msg-subtabs').count()) === 0;
  await page.screenshot({ path: `${OUT}/vue-verify-msgsel-sys.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
