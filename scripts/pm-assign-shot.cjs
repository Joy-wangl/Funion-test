/* 验证：分配成员弹窗 步骤2 改为「先选职位再选人」（组长单选 / 专员·助理多选） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qunion/Funion'.replace('Qunion', 'Qoder');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForTimeout(400);
  await page.click('.nav-parent:has-text("权限设置")');
  await page.waitForTimeout(300);
  await page.click('.subnav:has-text("部门管理")');
  await page.waitForTimeout(400);

  // 打开分配成员弹窗
  await page.click('button:has-text("添加成员")');
  await page.waitForSelector('.member-transfer');

  // 步骤1：搜索选 2 名成员
  const search = page.locator('.member-transfer-left .input');
  await search.fill('孙倩');
  await page.waitForSelector('.mtr-row:has(.og-ava)');
  await page.click('.mtr-row:has(.og-ava)');
  await search.fill('刘洋');
  await page.waitForSelector('.mtr-row:has(.og-ava)');
  await page.click('.mtr-row:has(.og-ava)');
  await search.fill('');
  await page.waitForTimeout(200);
  const selCnt = await page.locator('.member-transfer-right .mtr-selected').count();

  await page.click('.modal-foot .btn.primary');
  await page.waitForSelector('.am-step2');

  // 步骤2：默认专员，先选运营组，再多选 2 人
  await page.click('.og-bind-panel .bselect-trigger');
  await page.waitForSelector('.bselect-menu');
  await page.click('.bselect-opt >> nth=0');
  await page.waitForTimeout(200);
  const pickCount = await page.locator('.am-pick-list .am-pick').count();
  await page.click('.am-pick-list .am-pick >> nth=0');
  await page.click('.am-pick-list .am-pick >> nth=1');
  await page.waitForTimeout(200);
  const specOn = await page.locator('.am-pick.on').count();
  const specBadge = await page.locator('.og-pill:has-text("运营专员") .og-pill-n').textContent().catch(() => '');

  // 切助理：两人应显示「运营专员」他职标签；点选其一改配助理
  await page.click('.og-pill:has-text("运营助理")');
  await page.waitForTimeout(200);
  const asTags = await page.locator('.am-pick .as').count();
  await page.click('.am-pick-list .am-pick >> nth=0');
  await page.waitForTimeout(200);
  const astOn = await page.locator('.am-pick.on').count();
  const astLeftTag = await page.locator('.am-pick .as').count();

  // 切组长：单选语义，连点两人后仅 1 个 on
  await page.click('.og-pill:has-text("运营组长")');
  await page.waitForTimeout(200);
  const hasGroupNameInput = await page.locator('input[placeholder="请输入组名"]').count();
  await page.click('.am-pick-list .am-pick >> nth=0');
  await page.waitForTimeout(150);
  await page.click('.am-pick-list .am-pick >> nth=1');
  await page.waitForTimeout(200);
  const leaderOn = await page.locator('.am-pick.on').count();
  await page.screenshot({ path: `${OUT}/pm-assign2.png` });

  // 未填组名点确定 → 报错 toast
  await page.click('.modal-foot .btn.primary');
  await page.waitForTimeout(300);
  const toast = await page.locator('.toast.error').textContent().catch(() => '');

  console.log(JSON.stringify({
    step1Selected: selCnt,
    pickCount, specOn, specBadge: (specBadge || '').trim(),
    asTagsBeforePick: asTags, astOn, astLeftTagAfterPick: astLeftTag,
    hasGroupNameInput, leaderOn,
    confirmToast: (toast || '').trim(),
  }, null, 2));

  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
